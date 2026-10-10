/** Client-safe reorder helper for personal workout exercise rows (no Firebase Admin). */

export type ReorderablePersonalWorkoutExercise = {
  id: string;
  catalogId: string;
  sortOrder: number;
  targetSets: number;
  targetReps: string;
};

export function reorderPersonalWorkoutExercises<
  T extends ReorderablePersonalWorkoutExercise,
>(exercises: T[], orderedIds: string[]): T[] {
  const byId = new Map(exercises.map((row) => [row.id, row]));
  const ordered: T[] = [];
  orderedIds.forEach((id, index) => {
    const row = byId.get(id);
    if (!row) return;
    ordered.push({ ...row, sortOrder: index });
  });
  for (const row of exercises) {
    if (!orderedIds.includes(row.id)) {
      ordered.push({ ...row, sortOrder: ordered.length });
    }
  }
  return ordered;
}
