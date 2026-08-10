import Link from "next/link";
import { Plus } from "lucide-react";

import { requireGym } from "@/lib/session";
import { canManageMembers } from "@/lib/permissions";
import { getWorkoutPlansPageData } from "@/lib/workout-plans";
import { getExerciseLibrary } from "@/lib/workout-tracking/exercise-library";
import { PageHeader } from "@/components/page-header";
import { WorkoutPlanBuilder } from "@/components/workout/workout-plan-builder";
import { Button } from "@/components/ui/button";

export default async function NewWorkoutPlanPage({
  searchParams,
}: {
  searchParams: { memberId?: string };
}) {
  const user = await requireGym();
  if (!canManageMembers(user.role)) {
    return (
      <p className="text-sm text-muted-foreground">
        You do not have permission to manage workout plans.
      </p>
    );
  }

  const [{ members, plans }, library] = await Promise.all([
    getWorkoutPlansPageData(user.gymId),
    getExerciseLibrary(user.gymId),
  ]);

  const assigned = new Set(plans.map((plan) => plan.memberId));
  const eligibleMembers = members.filter((member) => !assigned.has(member.id));

  if (eligibleMembers.length === 0) {
    return (
      <div className="space-y-4">
        <PageHeader title="New workout plan" description="Assign a structured training programme." />
        <p className="text-sm text-muted-foreground">
          All members already have a workout plan. Edit or delete an existing plan first.
        </p>
        <Button asChild variant="outline">
          <Link href="/programmes/workout">Back to workout plans</Link>
        </Button>
      </div>
    );
  }

  const memberId =
    searchParams.memberId && eligibleMembers.some((m) => m.id === searchParams.memberId)
      ? searchParams.memberId
      : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="New workout plan"
        description="Pick exercises from your gym library and set targets for each member."
      />
      <WorkoutPlanBuilder
        members={eligibleMembers}
        library={library}
        fixedMemberId={memberId}
      />
    </div>
  );
}
