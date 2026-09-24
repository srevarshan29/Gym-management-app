import type {
  ExerciseDifficulty,
  ExerciseMediaMetadata,
} from "@/lib/exercises/catalog-types";
import { hasDemonstrationMedia } from "@/lib/exercises/media";
import { sanitizeCatalogExerciseMediaForRead } from "@/lib/exercises/media-validation";
import type { DocWithId } from "@/lib/firestore/repositories/base";
import type { ExerciseCatalogDoc, MuscleGroup } from "@/lib/firestore/types";

/** Staff-safe catalog preview fields (no gym-private data). */
export type CatalogBrowseItem = {
  catalogId: string;
  name: string;
  muscleGroup: MuscleGroup;
  description: string | null;
  equipment: string | null;
  difficulty: ExerciseDifficulty | null;
  primaryMuscles: string[];
  isBodyweight: boolean;
  hasMedia: boolean;
  media: ExerciseMediaMetadata | null;
  catalogVersion: string;
  alreadyImported: boolean;
};

export type CatalogBrowsePage = {
  items: CatalogBrowseItem[];
  nextCursor: string | null;
  hasMore: boolean;
};

export function toCatalogBrowseItem(
  doc: DocWithId<ExerciseCatalogDoc>,
  importedCatalogIds: Set<string>,
): CatalogBrowseItem {
  const media = sanitizeCatalogExerciseMediaForRead(doc.media, doc.catalogId);
  return {
    catalogId: doc.catalogId,
    name: doc.name,
    muscleGroup: doc.muscleGroup,
    description: doc.description,
    equipment: doc.equipment,
    difficulty: doc.difficulty,
    primaryMuscles: doc.primaryMuscles,
    isBodyweight: doc.isBodyweight,
    hasMedia: hasDemonstrationMedia(media),
    media,
    catalogVersion: doc.catalogVersion,
    alreadyImported: importedCatalogIds.has(doc.catalogId),
  };
}
