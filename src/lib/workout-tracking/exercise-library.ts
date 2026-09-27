import type { ExerciseTrackingType, MuscleGroup } from "@/lib/firestore/types";
import { getRepositories, platformContext } from "@/lib/firestore";
import { seedExercisesForGym } from "@/lib/exercises";
import { hasDemonstrationMedia } from "@/lib/exercises/media";
import {
  collectCatalogIdsForMediaHydration,
  collectNameLowerLookupsForSeededMedia,
  resolveGymExerciseMediaForRead,
  type GymExerciseMediaReadInput,
} from "@/lib/exercises/gym-exercise-media-read";
import { resolveExerciseSource } from "@/lib/exercises/source";
import type { ExerciseListItem } from "@/lib/workout-tracking/types";
import type { ExerciseLibraryMap } from "@/lib/workout-tracking/session-plan";
import type { DocWithId } from "@/lib/firestore/repositories/base";
import type { CustomExerciseDoc, ExerciseCatalogDoc } from "@/lib/firestore/types";

export const EXERCISE_LIBRARY_PAGE_SIZE = 50;
export const BUILDER_LIBRARY_SEARCH_LIMIT = 30;

export type ExerciseLibrarySearchPage = {
  items: ExerciseListItem[];
  nextCursor: string | null;
};

export type ExerciseLibraryBrowsePage = ExerciseLibrarySearchPage & {
  totalCount: number;
};

function toListItem(
  doc: GymExerciseMediaReadInput,
  catalogsById: ReadonlyMap<string, DocWithId<ExerciseCatalogDoc>>,
  catalogsByNameLower: ReadonlyMap<string, DocWithId<ExerciseCatalogDoc>>,
): ExerciseListItem {
  const media = resolveGymExerciseMediaForRead(
    doc,
    catalogsById,
    catalogsByNameLower,
  );
  return {
    id: doc.id,
    name: doc.name,
    muscleGroup: doc.muscleGroup,
    defaultSets: doc.defaultSets,
    defaultReps: doc.defaultReps,
    defaultTempo: doc.defaultTempo,
    defaultRestSeconds: doc.defaultRestSeconds,
    trackingType: doc.trackingType as ExerciseListItem["trackingType"],
    isSeeded: doc.isSeeded,
    exerciseSource: resolveExerciseSource(doc),
    catalogId: doc.catalogId ?? null,
    importedCatalogVersion: doc.importedCatalogVersion ?? null,
    media,
    hasMedia: hasDemonstrationMedia(media),
  };
}

async function loadCatalogMapsForExerciseDocs(
  docs: DocWithId<CustomExerciseDoc>[],
): Promise<{
  catalogsById: Map<string, DocWithId<ExerciseCatalogDoc>>;
  catalogsByNameLower: Map<string, DocWithId<ExerciseCatalogDoc>>;
}> {
  const { exerciseCatalog } = getRepositories();
  const catalogIds = collectCatalogIdsForMediaHydration(docs);
  const nameLowers = collectNameLowerLookupsForSeededMedia(docs);

  const [catalogsById, catalogsByNameLower] = await Promise.all([
    exerciseCatalog.getByCatalogIds(platformContext, catalogIds),
    exerciseCatalog.getActiveByNameLowerBatch(platformContext, nameLowers),
  ]);

  return { catalogsById, catalogsByNameLower };
}

async function mapDocsToListItems(
  docs: DocWithId<CustomExerciseDoc>[],
): Promise<ExerciseListItem[]> {
  const { catalogsById, catalogsByNameLower } =
    await loadCatalogMapsForExerciseDocs(docs);
  return docs.map((doc) => toListItem(doc, catalogsById, catalogsByNameLower));
}

function toLibraryMapEntry(doc: {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  trackingType: ExerciseTrackingType;
  isSeeded: boolean;
}) {
  return [
    doc.id,
    {
      name: doc.name,
      muscleGroup: doc.muscleGroup,
      trackingType: doc.trackingType,
      isSeeded: doc.isSeeded,
    },
  ] as const;
}

export async function searchExerciseLibrary(
  tenantGymId: string,
  options: {
    query?: string;
    muscleGroup?: MuscleGroup | null;
    startAfterId?: string | null;
    limit?: number;
  } = {},
): Promise<ExerciseLibrarySearchPage> {
  const { customExercises } = getRepositories();

  let page = await customExercises.searchLibrary(platformContext, tenantGymId, {
    query: options.query,
    muscleGroup: options.muscleGroup ?? null,
    startAfterId: options.startAfterId ?? null,
    limit: options.limit ?? BUILDER_LIBRARY_SEARCH_LIMIT,
  });

  if (
    page.items.length === 0 &&
    !options.query?.trim() &&
    !options.muscleGroup &&
    !options.startAfterId
  ) {
    await seedExercisesForGym(tenantGymId);
    page = await customExercises.searchLibrary(platformContext, tenantGymId, {
      limit: options.limit ?? BUILDER_LIBRARY_SEARCH_LIMIT,
    });
  }

  return {
    items: await mapDocsToListItems(page.items),
    nextCursor: page.nextCursor,
  };
}

export async function browseExerciseLibrary(
  tenantGymId: string,
  options: {
    query?: string;
    muscleGroup?: MuscleGroup | null;
    startAfterId?: string | null;
    limit?: number;
  } = {},
): Promise<ExerciseLibraryBrowsePage> {
  const { customExercises } = getRepositories();
  const limit = options.limit ?? EXERCISE_LIBRARY_PAGE_SIZE;
  const isFirstPage =
    !options.startAfterId && !options.query?.trim() && !options.muscleGroup;

  let page = await customExercises.searchLibrary(platformContext, tenantGymId, {
    query: options.query,
    muscleGroup: options.muscleGroup ?? null,
    startAfterId: options.startAfterId ?? null,
    limit,
  });

  if (
    page.items.length === 0 &&
    isFirstPage
  ) {
    await seedExercisesForGym(tenantGymId);
    page = await customExercises.searchLibrary(platformContext, tenantGymId, {
      limit,
    });
  }

  const totalCount =
    isFirstPage && page.items.length > 0
      ? await customExercises.countByGym(platformContext, tenantGymId)
      : isFirstPage
        ? page.items.length
        : 0;

  return {
    items: await mapDocsToListItems(page.items),
    nextCursor: page.nextCursor,
    totalCount,
  };
}

export async function getExercisesByIds(
  tenantGymId: string,
  ids: string[],
): Promise<ExerciseListItem[]> {
  if (ids.length === 0) return [];
  const { customExercises } = getRepositories();
  const rows = await customExercises.getByIds(platformContext, tenantGymId, ids);
  return mapDocsToListItems(rows);
}

export async function getExerciseLibraryMapByIds(
  tenantGymId: string,
  ids: string[],
): Promise<ExerciseLibraryMap> {
  if (ids.length === 0) return new Map();
  const { customExercises } = getRepositories();
  const rows = await customExercises.getByIds(platformContext, tenantGymId, ids);
  return new Map(
    rows.map((row) => toLibraryMapEntry(row)),
  );
}

/** @deprecated Removed — use browseExerciseLibrary with cursor pagination instead. */
export async function getExerciseLibraryPage(): Promise<never> {
  throw new Error(
    "getExerciseLibraryPage was removed; use browseExerciseLibrary with cursor pagination instead.",
  );
}

/** @deprecated Prefer browseExerciseLibrary, searchExerciseLibrary, or getExercisesByIds for bounded reads. */
export async function getExerciseLibrary(
  tenantGymId: string,
  muscleGroup?: MuscleGroup | null,
): Promise<ExerciseListItem[]> {
  const { customExercises } = getRepositories();

  let rows = muscleGroup
    ? await customExercises.listByMuscleGroup(
        platformContext,
        tenantGymId,
        muscleGroup,
      )
    : await customExercises.listLibrary(platformContext, tenantGymId);

  if (rows.length === 0 && !muscleGroup) {
    await seedExercisesForGym(tenantGymId);
    rows = await customExercises.listLibrary(platformContext, tenantGymId);
  }

  return mapDocsToListItems(rows);
}

export { groupExercisesByMuscle } from "@/lib/workout-tracking/exercise-library-grouping";
