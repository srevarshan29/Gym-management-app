import type { MuscleGroup } from "@/lib/muscle-groups";

export type CatalogBrowseFilterMode = "muscleGroup" | "fullBody" | "cardio";

export type CatalogBrowseFilter = {
  mode: CatalogBrowseFilterMode;
  /** Set when mode is `muscleGroup`; null means all muscle groups. */
  muscleGroup: MuscleGroup | null;
};

export class ConflictingCatalogBrowseFilterError extends Error {
  constructor() {
    super("Only one of muscleGroup, fullBody, or cardio browse filters may be set.");
    this.name = "ConflictingCatalogBrowseFilterError";
  }
}

export function resolveCatalogBrowseFilter(options: {
  muscleGroup?: MuscleGroup | null;
  fullBody?: boolean | null;
  cardio?: boolean | null;
}): CatalogBrowseFilter {
  const fullBody = options.fullBody === true;
  const cardio = options.cardio === true;
  const muscleGroup = options.muscleGroup ?? null;

  const flagCount = [fullBody, cardio, muscleGroup !== null].filter(Boolean).length;
  if (flagCount > 1) {
    throw new ConflictingCatalogBrowseFilterError();
  }

  if (fullBody) {
    return { mode: "fullBody", muscleGroup: null };
  }
  if (cardio) {
    return { mode: "cardio", muscleGroup: null };
  }
  return { mode: "muscleGroup", muscleGroup };
}

export function catalogBrowseFilterMatchesCursor(
  filter: CatalogBrowseFilter,
  cursor: { filterMode?: CatalogBrowseFilterMode | null; muscleGroup?: MuscleGroup | null },
): boolean {
  const mode = cursor.filterMode ?? "muscleGroup";
  if (filter.mode !== mode) return false;
  if (filter.mode !== "muscleGroup") return true;
  return (filter.muscleGroup ?? null) === (cursor.muscleGroup ?? null);
}
