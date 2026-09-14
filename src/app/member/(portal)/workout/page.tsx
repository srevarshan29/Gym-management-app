import { requireMember } from "@/lib/member-session";
import { getMemberWorkoutPlanDetail } from "@/lib/workout-plans";
import { getPreviousSetsForSessionExercises } from "@/lib/workout-tracking/previous-sets";
import { getActiveWorkoutSession } from "@/lib/workout-tracking/sessions";
import { MemberWorkoutPageClient } from "@/components/member-portal/workout/member-workout-page-client";
import { LockedLink } from "@/components/navigation/locked-link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function MemberWorkoutPage() {
  const session = await requireMember();

  const [plan, activeSession] = await Promise.all([
    getMemberWorkoutPlanDetail(session.gymId, session.memberId),
    getActiveWorkoutSession(session.gymId, session.memberId),
  ]);

  const previousSets = activeSession
    ? await getPreviousSetsForSessionExercises(
        session.gymId,
        session.memberId,
        activeSession.exercises.map((exercise) => ({
          sessionExerciseId: exercise.id,
          exerciseId: exercise.exerciseId,
          customName: exercise.customName,
        })),
      )
    : {};

  const canStart = Boolean(
    plan &&
      !plan.isLegacy &&
      plan.days.some((day) => day.exercises.length > 0),
  );

  return (
    <div className="space-y-4">
      {activeSession ? null : (
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-bold">Workout</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              View your plan and log sets during your session.
            </p>
          </div>
          <LockedLink
            href="/member/workout/progress"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Progress
          </LockedLink>
        </div>
      )}

      <MemberWorkoutPageClient
        plan={plan}
        activeSession={activeSession}
        previousSets={previousSets}
        canStart={canStart}
      />
    </div>
  );
}
