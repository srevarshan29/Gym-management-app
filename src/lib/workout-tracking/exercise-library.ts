import type { MuscleGroup } from "@/lib/firestore/types";
import { getRepositories, platformContext } from "@/lib/firestore";
import { seedExercisesForGym } from "@/lib/exercises";
import type { ExerciseListItem } from "@/lib/workout-tracking/types";

function toListItem(doc: {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  defaultSets: number | null;
  defaultReps: string | null;
  defaultTempo: string | null;
  defaultRestSeconds: number | null;
  isSeeded: boolean;
}): ExerciseListItem {
  return {
    id: doc.id,
    name: doc.name,
    muscleGroup: doc.muscleGroup,
    defaultSets: doc.defaultSets,
    defaultReps: doc.defaultReps,
    defaultTempo: doc.defaultTempo,
    defaultRestSeconds: doc.defaultRestSeconds,
    isSeeded: doc.isSeeded,
  };
}

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

  return rows.map(toListItem);
}

export { groupExercisesByMuscle } from "@/lib/workout-tracking/exercise-library-grouping";
