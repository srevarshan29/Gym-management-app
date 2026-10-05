import type { ExerciseMediaMetadata } from "@/lib/exercises/catalog-types";
import { emptyExerciseMediaMetadata } from "@/lib/exercises/media-validation";
import { getExercisesByIds } from "@/lib/workout-tracking/exercise-library";

export type MemberExerciseMediaEntry = {
  media: ExerciseMediaMetadata;
  hasMedia: boolean;
  youtubeUrl: string | null;
};

export const EMPTY_MEMBER_EXERCISE_MEDIA: MemberExerciseMediaEntry = {
  media: emptyExerciseMediaMetadata(),
  hasMedia: false,
  youtubeUrl: null,
};

/** Loads gym-scoped exercise media already sanitized for member read surfaces. */
export async function loadMemberExerciseMediaByIds(
  gymId: string,
  exerciseIds: string[],
): Promise<Map<string, MemberExerciseMediaEntry>> {
  if (exerciseIds.length === 0) {
    return new Map();
  }

  const items = await getExercisesByIds(gymId, exerciseIds);
  return new Map(
    items.map((item) => [
      item.id,
      {
        media: item.media ?? emptyExerciseMediaMetadata(),
        hasMedia: item.hasMedia,
        youtubeUrl: item.youtubeUrl,
      },
    ]),
  );
}

export function resolveMemberExerciseMedia(
  exerciseId: string | null | undefined,
  mediaById: Map<string, MemberExerciseMediaEntry>,
): MemberExerciseMediaEntry {
  const id = exerciseId?.trim();
  if (!id) {
    return EMPTY_MEMBER_EXERCISE_MEDIA;
  }
  return mediaById.get(id) ?? EMPTY_MEMBER_EXERCISE_MEDIA;
}
