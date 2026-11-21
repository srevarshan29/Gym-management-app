import type { ExerciseCatalogDoc } from "@/lib/firestore/types";

/** Legacy catalog docs may omit browse tags; reads default to false. */
export function normalizeExerciseCatalogBrowseTags<
  T extends Pick<ExerciseCatalogDoc, "fullBody" | "cardio">,
>(doc: T): T & { fullBody: boolean; cardio: boolean } {
  return {
    ...doc,
    fullBody: doc.fullBody === true,
    cardio: doc.cardio === true,
  };
}
