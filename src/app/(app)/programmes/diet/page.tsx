import { Suspense } from "react";

import { requireGym } from "@/lib/session";
import { canManageMembers } from "@/lib/permissions";
import { getDietPlansPageData } from "@/lib/diet-plans";
import { PageHeader } from "@/components/page-header";
import { ProgrammePlansPageSkeleton } from "@/components/page-loading-skeletons";
import { DietPlanDialog } from "@/components/diet-plan-dialog";
import { DietPlansList } from "@/components/diet-plans-list";

export default async function DietPlansPage({
  searchParams,
}: {
  searchParams?: { page?: string };
}) {
  const user = await requireGym();
  const canManage = canManageMembers(user.role);
  const page = Number(searchParams?.page ?? "1");

  return (
    <div className="space-y-6">
      <Suspense key={page} fallback={<DietPlansPageShell />}>
        <DietPlansPageContent gymId={user.gymId} canManage={canManage} page={page} />
      </Suspense>
    </div>
  );
}

function DietPlansPageShell() {
  return (
    <>
      <PageHeader
        title="Diet Plans"
        description="Nutrition programmes assigned to members."
      />
      <ProgrammePlansPageSkeleton />
    </>
  );
}

async function DietPlansPageContent({
  gymId,
  canManage,
  page,
}: {
  gymId: string;
  canManage: boolean;
  page: number;
}) {
  const { plans, members, assignedMemberIds, total, pageSize } =
    await getDietPlansPageData(gymId, page);

  const assignedSet = new Set(assignedMemberIds);
  const eligibleMembers = members.filter(
    (member) => !assignedSet.has(member.id),
  );

  const rows = plans.map((plan) => ({
    id: plan.id,
    memberId: plan.memberId,
    memberName: plan.memberName,
    title: plan.title,
    caloriesPerDay: plan.caloriesPerDay,
    mealPlan: plan.mealPlan,
  }));

  return (
    <>
      <PageHeader
        title="Diet Plans"
        description="Nutrition programmes assigned to members."
      >
        {canManage && eligibleMembers.length > 0 ? (
          <DietPlanDialog members={eligibleMembers} />
        ) : null}
      </PageHeader>

      <DietPlansList
        plans={rows}
        members={members}
        canManage={canManage}
        page={page}
        pageSize={pageSize}
        total={total}
      />
    </>
  );
}
