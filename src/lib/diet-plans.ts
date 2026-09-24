import { getRepositories, platformContext } from "@/lib/firestore";
import { DIET_PLANS_PAGE_SIZE } from "@/lib/firestore/repositories/diet-plans";
import type { MemberOption } from "@/lib/programme-types";

export type { MemberOption };

export type DietPlanListItem = {
  id: string;
  memberId: string;
  memberName: string;
  title: string;
  caloriesPerDay: number;
  mealPlan: string;
};

export type DietPlansPageData = {
  plans: DietPlanListItem[];
  members: MemberOption[];
  assignedMemberIds: string[];
  total: number;
  page: number;
  pageSize: number;
};

function toListItem(doc: {
  id: string;
  memberId: string;
  memberName: string;
  title: string;
  caloriesPerDay: number;
  mealPlan: string;
}): DietPlanListItem {
  return {
    id: doc.id,
    memberId: doc.memberId,
    memberName: doc.memberName,
    title: doc.title,
    caloriesPerDay: doc.caloriesPerDay,
    mealPlan: doc.mealPlan,
  };
}

export async function getDietPlansPageData(
  tenantGymId: string,
  page = 1,
): Promise<DietPlansPageData> {
  const { dietPlans, members } = getRepositories();

  const [planPage, memberOptions, assignedMemberIds] = await Promise.all([
    dietPlans.listDietPlanPage(platformContext, tenantGymId, {
      page,
      pageSize: DIET_PLANS_PAGE_SIZE,
    }),
    members.listMemberOptions(platformContext, tenantGymId),
    dietPlans.listAssignedMemberIds(platformContext, tenantGymId),
  ]);

  return {
    plans: planPage.items.map(toListItem),
    members: memberOptions,
    assignedMemberIds,
    total: planPage.total,
    page: planPage.page,
    pageSize: planPage.pageSize,
  };
}

/** Full list for CSV export (cursor-paged, capped at 1000 rows). */
export async function getAllDietPlansForExport(
  tenantGymId: string,
): Promise<DietPlanListItem[]> {
  const { dietPlans } = getRepositories();
  const rows = await dietPlans.listAllForExport(platformContext, tenantGymId);
  return rows.map(toListItem);
}
