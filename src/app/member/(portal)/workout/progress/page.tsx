import { requireMember } from "@/lib/member-session";
import { getMemberExerciseOptions, getExerciseProgressData } from "@/lib/workout-tracking/progress";
import { MemberProgressPanel } from "@/components/member-portal/workout/member-progress-panel";

export default async function MemberWorkoutProgressPage({
  searchParams,
}: {
  searchParams: { exercise?: string; grouping?: string };
}) {
  const session = await requireMember();
  const exercises = await getMemberExerciseOptions(
    session.gymId,
    session.memberId,
  );

  const exerciseKey =
    searchParams.exercise && exercises.some((e) => e.key === searchParams.exercise)
      ? searchParams.exercise
      : exercises[0]?.key;

  const grouping =
    searchParams.grouping === "monthly" ? "monthly" : ("weekly" as const);

  const progress = exerciseKey
    ? await getExerciseProgressData(
        session.gymId,
        session.memberId,
        exerciseKey,
        grouping,
      )
    : null;

  return (
    <MemberProgressPanel
      exercises={exercises}
      initialExerciseKey={exerciseKey}
      initialGrouping={grouping}
      progress={progress}
    />
  );
}
