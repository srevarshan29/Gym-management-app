import { hasDemonstrationMedia } from "@/lib/exercises/media";
import { sanitizeCatalogExerciseMediaForRead } from "@/lib/exercises/media-validation";
import { resolveSeededTrackingType } from "@/lib/exercises";
import type { ExerciseMediaMetadata } from "@/lib/exercises/catalog-types";
import { getRepositories } from "@/lib/firestore";
import type { MemberContext } from "@/lib/firestore/context";
import type { DocWithId } from "@/lib/firestore/repositories/base";
import type {
  ExerciseCatalogDoc,
  ExerciseTrackingType,
  MuscleGroup,
} from "@/lib/firestore/types";
import type { MemberLibraryMuscleFilter } from "@/lib/member-portal/member-library-muscle-groups";
import { exerciseMatchesMemberLibraryRegion } from "@/lib/member-portal/member-muscle-region-filter";
import type { ChestMuscleRegion } from "@/lib/member-portal/chest-muscle-regions";
import {
  createInitialMemberLibraryRegionBrowseState,
  decodeMemberLibraryRegionBrowseCursor,
  encodeMemberLibraryRegionBrowseCursor,
  MemberLibraryRegionPaginationError,
  regionBrowseHasMore,
  type MemberLibraryRegionBrowseState,
} from "@/lib/workout-tracking/member-library-region-browse-cursor";

export { MemberLibraryRegionPaginationError } from "@/lib/workout-tracking/member-library-region-browse-cursor";
import type { ExerciseListItem } from "@/lib/workout-tracking/types";

/** Max catalog docs scanned per region browse (safety cap). */
export const MEMBER_REGION_CATALOG_SCAN_LIMIT = 300;

/** Must match `MAX_CATALOG_PAGE_SIZE` in exercise-catalog repository. */
const MEMBER_REGION_FIRESTORE_PAGE_SIZE = 50;

export const MEMBER_CATALOG_EXERCISE_ID_PREFIX = "catalog:";

export function memberCatalogExerciseId(catalogId: string): string {
  return `${MEMBER_CATALOG_EXERCISE_ID_PREFIX}${catalogId.trim()}`;
}

export function parseMemberCatalogExerciseId(
  exerciseId: string | null | undefined,
): string | null {
  const id = exerciseId?.trim() ?? "";
  if (!id.startsWith(MEMBER_CATALOG_EXERCISE_ID_PREFIX)) return null;
  const catalogId = id.slice(MEMBER_CATALOG_EXERCISE_ID_PREFIX.length).trim();
  return catalogId || null;
}

export function catalogTrackingType(doc: ExerciseCatalogDoc): ExerciseTrackingType {
  if (doc.isBodyweight) return "BODYWEIGHT";
  return resolveSeededTrackingType(doc.name, "WEIGHTED", false);
}

export function catalogDocToExerciseListItem(
  doc: DocWithId<ExerciseCatalogDoc>,
  youtubeUrl?: string | null,
): ExerciseListItem {
  const media = sanitizeCatalogExerciseMediaForRead(doc.media, doc.catalogId);
  const trackingType = catalogTrackingType(doc);
  return {
    id: memberCatalogExerciseId(doc.catalogId),
    name: doc.name,
    muscleGroup: doc.muscleGroup,
    defaultSets: 3,
    defaultReps: "10",
    defaultTempo: null,
    defaultRestSeconds: 90,
    trackingType,
    isSeeded: false,
    exerciseSource: "CATALOG",
    catalogId: doc.catalogId,
    importedCatalogVersion: doc.catalogVersion,
    media,
    hasMedia: hasDemonstrationMedia(media),
    youtubeUrl: youtubeUrl?.trim() || null,
  };
}

export type MemberCatalogListItem = {
  catalogId: string;
  name: string;
  muscleGroup: MuscleGroup;
  primaryMuscles: string[];
  equipment: string | null;
  hasMedia: boolean;
  thumbnailUrl: string | null;
};

export type MemberCatalogBrowsePage = {
  items: MemberCatalogListItem[];
  nextCursor: string | null;
  hasMore: boolean;
};

function toListItem(doc: DocWithId<ExerciseCatalogDoc>): MemberCatalogListItem {
  const media = sanitizeCatalogExerciseMediaForRead(doc.media, doc.catalogId);
  return {
    catalogId: doc.catalogId,
    name: doc.name,
    muscleGroup: doc.muscleGroup,
    primaryMuscles: doc.primaryMuscles ?? [],
    equipment: doc.equipment,
    hasMedia: hasDemonstrationMedia(media),
    thumbnailUrl: media.thumbnailUrl ?? media.primaryImageUrl,
  };
}

function paginateCatalogListItems(
  items: MemberCatalogListItem[],
  startAfterId: string | null | undefined,
  limit: number,
): MemberCatalogBrowsePage {
  const sorted = [...items].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
  let start = 0;
  const cursor = startAfterId?.trim();
  if (cursor) {
    const idx = sorted.findIndex((row) => row.catalogId === cursor);
    start = idx >= 0 ? idx + 1 : 0;
  }
  const window = sorted.slice(start, start + limit + 1);
  const hasMore = window.length > limit;
  const page = hasMore ? window.slice(0, limit) : window;
  return {
    items: page,
    nextCursor: hasMore ? page[page.length - 1]!.catalogId : null,
    hasMore,
  };
}

function applyMemberLibraryRegionFilter(
  items: MemberCatalogListItem[],
  libraryGroup: MemberLibraryMuscleFilter,
  regionId: string,
): MemberCatalogListItem[] {
  return items.filter((item) =>
    exerciseMatchesMemberLibraryRegion({
      muscleGroup: item.muscleGroup,
      exerciseName: item.name,
      primaryMuscles: item.primaryMuscles,
      libraryGroup,
      regionId,
    }),
  );
}

function compareCatalogBrowseOrder(
  a: DocWithId<ExerciseCatalogDoc>,
  b: DocWithId<ExerciseCatalogDoc>,
): number {
  const aKey = a.nameLower ?? a.name.toLowerCase();
  const bKey = b.nameLower ?? b.name.toLowerCase();
  const byName = aKey.localeCompare(bKey);
  if (byName !== 0) return byName;
  return a.catalogId.localeCompare(b.catalogId);
}

type RegionCatalogScanResult = {
  filteredItems: MemberCatalogListItem[];
  scannedDocumentCount: number;
  scanExhausted: boolean;
  scanCapReached: boolean;
};

/**
 * Loads up to {@link MEMBER_REGION_CATALOG_SCAN_LIMIT} active catalog docs for a
 * muscle group using repository cursor pagination (50 per request), then filters
 * by member-library region rules.
 */
export async function scanMemberLibraryRegionCatalog(
  ctx: MemberContext,
  exerciseCatalog: {
    listPage: (
      ctx: MemberContext,
      options: {
        muscleGroup: MuscleGroup;
        limit?: number;
        startAfterId?: string | null;
        activeOnly?: boolean;
      },
    ) => Promise<{
      items: DocWithId<ExerciseCatalogDoc>[];
      nextCursor: string | null;
      hasMore: boolean;
    }>;
  },
  input: {
    muscleGroup: MuscleGroup;
    libraryGroup: MemberLibraryMuscleFilter;
    regionId: string;
    scanLimit?: number;
  },
): Promise<RegionCatalogScanResult> {
  const scanLimit = input.scanLimit ?? MEMBER_REGION_CATALOG_SCAN_LIMIT;
  const collected: DocWithId<ExerciseCatalogDoc>[] = [];
  let startAfterId: string | null = null;
  let scanExhausted = false;
  let scanCapReached = false;

  while (collected.length < scanLimit) {
    const remaining = scanLimit - collected.length;
    const pageSize = Math.min(MEMBER_REGION_FIRESTORE_PAGE_SIZE, remaining);
    const page = await exerciseCatalog.listPage(ctx, {
      muscleGroup: input.muscleGroup,
      limit: pageSize,
      startAfterId,
      activeOnly: true,
    });

    if (page.items.length === 0) {
      scanExhausted = true;
      break;
    }

    const sortedPage = [...page.items].sort(compareCatalogBrowseOrder);
    collected.push(...sortedPage);

    if (!page.hasMore) {
      scanExhausted = true;
      break;
    }

    startAfterId = page.nextCursor;
    if (!startAfterId) {
      scanExhausted = true;
      break;
    }

    if (collected.length >= scanLimit) {
      scanCapReached = !scanExhausted;
      break;
    }
  }

  const filteredItems = applyMemberLibraryRegionFilter(
    collected.map(toListItem),
    input.libraryGroup,
    input.regionId,
  );

  return {
    filteredItems,
    scannedDocumentCount: collected.length,
    scanExhausted,
    scanCapReached,
  };
}

type RegionCatalogListPageFetcher = {
  listPage: (
    ctx: MemberContext,
    options: {
      muscleGroup: MuscleGroup;
      limit?: number;
      startAfterId?: string | null;
      activeOnly?: boolean;
    },
  ) => Promise<{
    items: DocWithId<ExerciseCatalogDoc>[];
    nextCursor: string | null;
    hasMore: boolean;
  }>;
};

async function fetchRegionCatalogFirestorePage(
  ctx: MemberContext,
  exerciseCatalog: RegionCatalogListPageFetcher,
  state: MemberLibraryRegionBrowseState,
  scanLimit: number,
): Promise<MemberLibraryRegionBrowseState> {
  if (state.firestoreExhausted || state.scanCapReached) {
    return state;
  }
  if (state.scannedDocs >= scanLimit) {
    return { ...state, scanCapReached: true };
  }

  const remaining = scanLimit - state.scannedDocs;
  const pageSize = Math.min(MEMBER_REGION_FIRESTORE_PAGE_SIZE, remaining);
  const page = await exerciseCatalog.listPage(ctx, {
    muscleGroup: state.muscleGroup,
    limit: pageSize,
    startAfterId: state.firestoreCursor,
    activeOnly: true,
  });

  if (page.items.length === 0) {
    return { ...state, firestoreExhausted: true };
  }

  const sortedPage = [...page.items].sort(compareCatalogBrowseOrder);
  const pending = [...state.pending];
  for (const doc of sortedPage) {
    const listItem = toListItem(doc);
    const match = exerciseMatchesMemberLibraryRegion({
      muscleGroup: listItem.muscleGroup,
      exerciseName: listItem.name,
      primaryMuscles: listItem.primaryMuscles,
      libraryGroup: state.libraryGroup,
      regionId: state.regionId,
    });
    if (match) pending.push(listItem);
  }

  const scannedDocs = state.scannedDocs + sortedPage.length;
  let firestoreExhausted = !page.hasMore;
  let scanCapReached = scannedDocs >= scanLimit;
  let firestoreCursor = page.nextCursor;

  if (!page.hasMore || !firestoreCursor) {
    firestoreExhausted = true;
    firestoreCursor = null;
  }

  return {
    ...state,
    pending,
    scannedDocs,
    firestoreExhausted,
    scanCapReached,
    firestoreCursor,
  };
}

/**
 * Incremental region browse: scans Firestore in 50-doc pages, buffers matches,
 * and returns one UI page while preserving undelivered matches in the cursor.
 */
export async function browseMemberLibraryRegionCatalog(
  ctx: MemberContext,
  exerciseCatalog: RegionCatalogListPageFetcher,
  input: {
    muscleGroup: MuscleGroup;
    libraryGroup?: MemberLibraryMuscleFilter | null;
    regionId: string;
    startAfterId?: string | null;
    limit?: number;
    scanLimit?: number;
  },
): Promise<MemberCatalogBrowsePage> {
  const limit = input.limit ?? 20;
  const scanLimit = input.scanLimit ?? MEMBER_REGION_CATALOG_SCAN_LIMIT;
  const effectiveLibraryGroup = (input.libraryGroup ??
    input.muscleGroup) as MemberLibraryMuscleFilter;
  const startAfter = input.startAfterId?.trim() || null;

  let state: MemberLibraryRegionBrowseState;
  if (!startAfter) {
    state = createInitialMemberLibraryRegionBrowseState({
      muscleGroup: input.muscleGroup,
      libraryGroup: effectiveLibraryGroup,
      regionId: input.regionId,
    });
  } else {
    const decoded = decodeMemberLibraryRegionBrowseCursor(startAfter);
    if (!decoded) {
      throw new MemberLibraryRegionPaginationError(
        "This list could not be continued. Refresh to load exercises again.",
      );
    }
    if (
      decoded.muscleGroup !== input.muscleGroup ||
      decoded.libraryGroup !== effectiveLibraryGroup ||
      decoded.regionId !== input.regionId
    ) {
      throw new MemberLibraryRegionPaginationError(
        "Pagination does not match this region. Refresh to load exercises again.",
      );
    }
    state = decoded;
  }

  while (state.pending.length < limit + 1) {
    const beforeScanned = state.scannedDocs;
    state = await fetchRegionCatalogFirestorePage(
      ctx,
      exerciseCatalog,
      state,
      scanLimit,
    );
    if (
      state.pending.length < limit + 1 &&
      (state.firestoreExhausted ||
        state.scanCapReached ||
        state.scannedDocs === beforeScanned)
    ) {
      break;
    }
  }

  const items = state.pending.slice(0, limit);
  const pending = state.pending.slice(limit);
  const nextState: MemberLibraryRegionBrowseState = { ...state, pending };
  const hasMore = regionBrowseHasMore(nextState);

  return {
    items,
    nextCursor: hasMore
      ? encodeMemberLibraryRegionBrowseCursor(nextState)
      : null,
    hasMore,
  };
}

export async function browseMemberExerciseCatalog(
  ctx: MemberContext,
  input: {
    query?: string;
    muscleGroup?: MuscleGroup | null;
    fullBody?: boolean;
    cardio?: boolean;
    chestRegion?: ChestMuscleRegion | null;
    libraryRegion?: string | null;
    libraryGroup?: MemberLibraryMuscleFilter | null;
    startAfterId?: string | null;
    limit?: number;
  } = {},
): Promise<MemberCatalogBrowsePage> {
  const { exerciseCatalog } = getRepositories();
  const trimmedQuery = input.query?.trim() ?? "";
  const limit = input.limit ?? 20;
  const libraryGroup =
    input.libraryGroup ??
    (input.muscleGroup as MemberLibraryMuscleFilter | undefined) ??
    null;
  const libraryRegion =
    input.libraryRegion ??
    (input.muscleGroup === "CHEST" ? input.chestRegion ?? null : null);

  const scanMuscleGroup = input.muscleGroup;
  if (
    !trimmedQuery &&
    scanMuscleGroup &&
    libraryGroup &&
    libraryRegion
  ) {
    return browseMemberLibraryRegionCatalog(ctx, exerciseCatalog, {
      muscleGroup: scanMuscleGroup,
      libraryGroup,
      regionId: libraryRegion,
      startAfterId: input.startAfterId,
      limit,
    });
  }

  const rawPage = trimmedQuery
    ? await exerciseCatalog.searchByPrefix(ctx, {
        query: trimmedQuery,
        muscleGroup: input.muscleGroup ?? null,
        fullBody: input.fullBody ?? null,
        cardio: input.cardio ?? null,
        startAfterId: input.startAfterId ?? null,
        limit,
      })
    : await exerciseCatalog.listPage(ctx, {
        muscleGroup: input.muscleGroup ?? null,
        fullBody: input.fullBody ?? null,
        cardio: input.cardio ?? null,
        startAfterId: input.startAfterId ?? null,
        limit,
        activeOnly: true,
      });

  let items = rawPage.items.map(toListItem);
  if (libraryGroup && libraryRegion) {
    items = applyMemberLibraryRegionFilter(items, libraryGroup, libraryRegion);
  }

  return {
    items,
    nextCursor: rawPage.nextCursor,
    hasMore: rawPage.hasMore && items.length > 0,
  };
}

export type MemberCatalogExerciseDetail = {
  catalogId: string;
  name: string;
  muscleGroup: MuscleGroup;
  description: string | null;
  instructions: string[];
  tips: string[] | null;
  equipment: string | null;
  difficulty: string | null;
  primaryMuscles: string[];
  isBodyweight: boolean;
  media: ExerciseMediaMetadata | null;
  hasMedia: boolean;
  youtubeUrl: string | null;
  trackingType: ExerciseTrackingType;
};

export async function getMemberCatalogExerciseDetail(
  ctx: MemberContext,
  gymId: string,
  catalogId: string,
): Promise<MemberCatalogExerciseDetail | null> {
  const { exerciseCatalog, customExercises } = getRepositories();
  const doc = await exerciseCatalog.getByCatalogId(ctx, catalogId);
  if (!doc || !doc.isActive) return null;

  const media = sanitizeCatalogExerciseMediaForRead(doc.media, doc.catalogId);
  let youtubeUrl: string | null = null;
  const gymRow = await customExercises.findByCatalogId(ctx, gymId, catalogId);
  if (gymRow?.youtubeUrl?.trim()) {
    youtubeUrl = gymRow.youtubeUrl.trim();
  }

  return {
    catalogId: doc.catalogId,
    name: doc.name,
    muscleGroup: doc.muscleGroup,
    description: doc.description,
    instructions: doc.instructions ?? [],
    tips: doc.tips,
    equipment: doc.equipment,
    difficulty: doc.difficulty,
    primaryMuscles: doc.primaryMuscles,
    isBodyweight: doc.isBodyweight,
    media,
    hasMedia: hasDemonstrationMedia(media),
    youtubeUrl,
    trackingType: catalogTrackingType(doc),
  };
}

export async function getMemberCatalogExercisesAsListItems(
  ctx: MemberContext,
  gymId: string,
  catalogIds: string[],
): Promise<ExerciseListItem[]> {
  if (catalogIds.length === 0) return [];
  const { exerciseCatalog, customExercises } = getRepositories();
  const byCatalog = await exerciseCatalog.getByCatalogIds(ctx, catalogIds);

  return catalogIds
    .map((id) => byCatalog.get(id))
    .filter((d): d is DocWithId<ExerciseCatalogDoc> => Boolean(d))
    .map((doc) => catalogDocToExerciseListItem(doc, null));
}

export async function resolveMixedExerciseListItems(
  ctx: MemberContext,
  gymId: string,
  exerciseIds: string[],
): Promise<ExerciseListItem[]> {
  const catalogIds: string[] = [];
  const gymIds: string[] = [];
  for (const id of exerciseIds) {
    const catalogId = parseMemberCatalogExerciseId(id);
    if (catalogId) catalogIds.push(catalogId);
    else gymIds.push(id);
  }

  const { getExercisesByIds } = await import(
    "@/lib/workout-tracking/exercise-library"
  );

  const [catalogItems, gymItems] = await Promise.all([
    getMemberCatalogExercisesAsListItems(ctx, gymId, catalogIds),
    gymIds.length > 0 ? getExercisesByIds(gymId, gymIds) : Promise.resolve([]),
  ]);

  const byId = new Map<string, ExerciseListItem>();
  for (const item of [...catalogItems, ...gymItems]) {
    byId.set(item.id, item);
  }
  return exerciseIds
    .map((id) => byId.get(id))
    .filter((item): item is ExerciseListItem => Boolean(item));
}
