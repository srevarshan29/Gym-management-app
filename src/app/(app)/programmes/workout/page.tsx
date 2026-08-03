import { Suspense } from "react";

import { requireGym } from "@/lib/session";
import { canManageMembers } from "@/lib/permissions";
import { getWorkoutPlansPageData } from "@/lib/workout-plans";
import { PageHeader } from "@/components/page-header";
import { ProgrammePlansPageSkeleton } from "@/components/page-loading-skeletons";
import { WorkoutPlanDialog } from "@/components/workout-plan-dialog";
import { WorkoutPlansList } from "@/components/workout-plans-list";

export default async function WorkoutPlansPage() {
  const user = await requireGym();
  const canManage = canManageMembers(user.role);

  return (
    <div className="space-y-6">
      <Suspense fallback={<WorkoutPlansPageShell />}>
        <WorkoutPlansPageContent gymId={user.gymId} canManage={canManage} />
      </Suspense>
    </div>
  );
}

function WorkoutPlansPageShell() {
  return (
    <>
      <PageHeader
        title="Workout Plans"
        description="Training programmes assigned to members."
      />
      <ProgrammePlansPageSkeleton />
    </>
  );
}

async function WorkoutPlansPageContent({
  gymId,
  canManage,
}: {
  gymId: string;
  canManage: boolean;
}) {
  const { plans, members } = await getWorkoutPlansPageData(gymId);

  const assignedMemberIds = new Set(plans.map((plan) => plan.memberId));
  const eligibleMembers = members.filter(
    (member) => !assignedMemberIds.has(member.id),
  );

  const rows = plans.map((plan) => ({
    id: plan.id,
    memberId: plan.memberId,
    memberName: plan.memberName,
    title: plan.title,
    level: plan.level,
    weeklySchedule: plan.weeklySchedule,
  }));

  return (
    <>
      <PageHeader
        title="Workout Plans"
        description="Training programmes assigned to members."
      >
        {canManage && eligibleMembers.length > 0 ? (
          <WorkoutPlanDialog members={eligibleMembers} />
        ) : null}
      </PageHeader>

      <WorkoutPlansList plans={rows} members={members} canManage={canManage} />
    </>
  );
}
