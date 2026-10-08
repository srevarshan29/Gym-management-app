import { getRepositories } from "@/lib/firestore";
import type { MemberContext } from "@/lib/firestore/context";
import {
  resolveNutritionCalorieTarget,
  type ResolvedNutritionCalorieTarget,
} from "@/lib/nutrition/nutrition-calorie-target";

export async function loadResolvedNutritionCalorieTarget(
  ctx: MemberContext,
): Promise<ResolvedNutritionCalorieTarget> {
  const { dietPlans, nutritionMemberSettings } = getRepositories();
  const [dietPlan, settings] = await Promise.all([
    dietPlans.findByMemberId(ctx, ctx.gymId, ctx.memberId),
    nutritionMemberSettings.getForMember(ctx, ctx.gymId, ctx.memberId),
  ]);

  return resolveNutritionCalorieTarget({
    memberCustomDailyCalorieTarget: settings?.customDailyCalorieTarget,
    gymDietPlanCaloriesPerDay: dietPlan?.caloriesPerDay,
  });
}
