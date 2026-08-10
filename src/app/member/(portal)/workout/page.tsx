import Link from "next/link";

import { requireMember } from "@/lib/member-session";
import { getMemberWorkoutPlanDetail } from "@/lib/workout-plans";
import { getActiveWorkoutSession } from "@/lib/workout-tracking/sessions";
import { MemberWorkoutPageClient } from "@/components/member-portal/workout/member-workout-page-client";
import { Button } from "@/components/ui/button";

export default async function MemberWorkoutPage() {
  const session = await requireMember();
  const [plan, activeSession] = await Promise.all([
    getMemberWorkoutPlanDetail(session.gymId, session.memberId),
    getActiveWorkoutSession(session.gymId, session.memberId),
  ]);

  const canStart = Boolean(plan && !plan.isLegacy && plan.exercises.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold">Workout</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View your plan and log sets during your session.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/member/workout/progress">Progress</Link>
        </Button>
      </div>
      <MemberWorkoutPageClient
        plan={plan}
        activeSession={activeSession}
        canStart={canStart}
      />
    </div>
  );
}
