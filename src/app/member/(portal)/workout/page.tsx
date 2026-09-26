import { requireMember } from "@/lib/member-session";
import { loadMemberWorkoutPageData } from "@/lib/workout-tracking/member-workout-page";
import { MemberWorkoutPageClient } from "@/components/member-portal/workout/member-workout-page-client";
import { LockedLink } from "@/components/navigation/locked-link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function MemberWorkoutPage() {
  const session = await requireMember();

  const { plan, activeSession, previousSets, canStart } =
    await loadMemberWorkoutPageData(session.gymId, session.memberId);

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
