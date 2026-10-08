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
import type { ExerciseListItem } from "@/lib/workout-tracking/types";

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
    equipment: doc.equipment,
    hasMedia: hasDemonstrationMedia(media),
    thumbnailUrl: media.thumbnailUrl ?? media.primaryImageUrl,
  };
}

export async function browseMemberExerciseCatalog(
  ctx: MemberContext,
  input: {
    query?: string;
    muscleGroup?: MuscleGroup | null;
    startAfterId?: string | null;
    limit?: number;
  } = {},
): Promise<MemberCatalogBrowsePage> {
  const { exerciseCatalog } = getRepositories();
  const trimmedQuery = input.query?.trim() ?? "";
  const rawPage = trimmedQuery
    ? await exerciseCatalog.searchByPrefix(ctx, {
        query: trimmedQuery,
        muscleGroup: input.muscleGroup ?? null,
        startAfterId: input.startAfterId ?? null,
        limit: input.limit ?? 20,
      })
    : await exerciseCatalog.listPage(ctx, {
        muscleGroup: input.muscleGroup ?? null,
        startAfterId: input.startAfterId ?? null,
        limit: input.limit ?? 20,
        activeOnly: true,
      });

  return {
    items: rawPage.items.map(toListItem),
    nextCursor: rawPage.nextCursor,
    hasMore: rawPage.hasMore,
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
