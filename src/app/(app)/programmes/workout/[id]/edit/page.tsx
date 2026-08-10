import Link from "next/link";
import { notFound } from "next/navigation";

import { requireGym } from "@/lib/session";
import { canManageMembers } from "@/lib/permissions";
import { getWorkoutPlanDetail } from "@/lib/workout-plans";
import { getExerciseLibrary } from "@/lib/workout-tracking/exercise-library";
import { PageHeader } from "@/components/page-header";
import { WorkoutPlanBuilder } from "@/components/workout/workout-plan-builder";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function EditWorkoutPlanPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireGym();
  if (!canManageMembers(user.role)) {
    return (
      <p className="text-sm text-muted-foreground">
        You do not have permission to manage workout plans.
      </p>
    );
  }

  const [plan, library] = await Promise.all([
    getWorkoutPlanDetail(user.gymId, params.id),
    getExerciseLibrary(user.gymId),
  ]);
  if (!plan) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit plan — ${plan.memberName}`}
        description="Update programme details and exercise targets."
      />

      {plan.isLegacy ? (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Legacy free-text plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <pre className="whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 text-sm">
              {plan.weeklySchedule}
            </pre>
            <p className="text-sm text-muted-foreground">
              Saving a structured plan below will replace this legacy schedule.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <WorkoutPlanBuilder
        members={[{ id: plan.memberId, name: plan.memberName }]}
        library={library}
        plan={plan}
        fixedMemberId={plan.memberId}
      />

      <Button asChild variant="outline">
        <Link href="/programmes/workout">Back to workout plans</Link>
      </Button>
    </div>
  );
}
