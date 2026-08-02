import { requireGym } from "@/lib/session";
import { canManageMembers } from "@/lib/permissions";
import { getDietPlansPageData } from "@/lib/diet-plans";
import { PageHeader } from "@/components/page-header";
import { DietPlanDialog } from "@/components/diet-plan-dialog";
import { DietPlansList } from "@/components/diet-plans-list";

export default async function DietPlansPage() {
  const user = await requireGym();
  const canManage = canManageMembers(user.role);
  const { plans, members } = await getDietPlansPageData(user.gymId);

  const assignedMemberIds = new Set(plans.map((plan) => plan.memberId));
  const eligibleMembers = members.filter(
    (member) => !assignedMemberIds.has(member.id),
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
    <div className="space-y-6">
      <PageHeader
        title="Diet Plans"
        description="Nutrition programmes assigned to members."
      >
        {canManage && eligibleMembers.length > 0 ? (
          <DietPlanDialog members={eligibleMembers} />
        ) : null}
      </PageHeader>

      <DietPlansList plans={rows} members={members} canManage={canManage} />
    </div>
  );
}
