import { requireGym } from "@/lib/session";
import { canManageMembers } from "@/lib/permissions";
import { getExerciseLibrary } from "@/lib/workout-tracking/exercise-library";
import { muscleGroupLabel } from "@/lib/exercises";
import { PageHeader } from "@/components/page-header";
import { AddExerciseDialog } from "@/components/workout/add-exercise-dialog";
import { ExerciseLibraryList } from "@/components/workout/exercise-library-list";
import type { MuscleGroup } from "@prisma/client";

export default async function ExerciseLibraryPage() {
  const user = await requireGym();
  const canManage = canManageMembers(user.role);
  const exercises = await getExerciseLibrary(user.gymId);

  const grouped = exercises.reduce<Record<string, typeof exercises>>((acc, item) => {
    const label = muscleGroupLabel(item.muscleGroup as MuscleGroup);
    if (!acc[label]) acc[label] = [];
    acc[label]!.push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exercise library"
        description="Starter exercises plus your gym's custom entries for building member plans."
      >
        {canManage ? <AddExerciseDialog /> : null}
      </PageHeader>
      <ExerciseLibraryList grouped={grouped} canManage={canManage} />
    </div>
  );
}
