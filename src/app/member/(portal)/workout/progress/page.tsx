import { requireMember } from "@/lib/member-session";
import { loadMemberWorkoutProgressPage } from "@/lib/workout-tracking/progress";
import { MemberProgressPanel } from "@/components/member-portal/workout/member-progress-panel";

export default async function MemberWorkoutProgressPage({
  searchParams,
}: {
  searchParams: { exercise?: string; grouping?: string };
}) {
  const session = await requireMember();

  const grouping =
    searchParams.grouping === "monthly" ? "monthly" : ("weekly" as const);

  const { exercises, exerciseKey, progress } = await loadMemberWorkoutProgressPage(
    session.gymId,
    session.memberId,
    searchParams.exercise,
    grouping,
  );

  return (
    <MemberProgressPanel
      exercises={exercises}
      initialExerciseKey={exerciseKey}
      initialGrouping={grouping}
      progress={progress}
    />
  );
}
