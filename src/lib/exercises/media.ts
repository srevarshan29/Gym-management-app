import type { ExerciseMediaMetadata } from "@/lib/exercises/catalog-types";
import { isStructuredExerciseMediaUrl } from "@/lib/exercises/media-paths";

/**
 * Returns true when the exercise has at least one valid demonstration image URL.
 * v1 supports static primary/secondary images only (not animation or video).
 */
export function hasDemonstrationMedia(
  media?: ExerciseMediaMetadata | null,
): boolean {
  if (!media) return false;
  return (
    isStructuredExerciseMediaUrl(media.primaryImageUrl ?? "") ||
    isStructuredExerciseMediaUrl(media.secondaryImageUrl ?? "") ||
    isStructuredExerciseMediaUrl(media.thumbnailUrl ?? "")
  );
}
