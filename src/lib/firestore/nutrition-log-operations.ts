import { getRepositories, newDocId, platformContext } from "@/lib/firestore";
import type { MemberContext } from "@/lib/firestore/context";
import type { NutritionMealType } from "@/lib/firestore/types";
import {
  calculateMacrosFromFood,
  clampQuantityGrams,
} from "@/lib/nutrition/calculations";
import {
  buildMemberNutritionDayView,
  loadMemberNutritionDay,
  parseNutritionLogDate,
  type MemberNutritionDayView,
} from "@/lib/nutrition/member-day";

export async function addMemberNutritionLogEntry(
  ctx: MemberContext,
  input: {
    logDate: string;
    mealType: NutritionMealType;
    foodId: string;
    quantityGrams: number;
  },
): Promise<MemberNutritionDayView> {
  const logDate = parseNutritionLogDate(input.logDate);
  const { nutritionFoodCatalog, nutritionLogs } = getRepositories();

  const food = await nutritionFoodCatalog.getByFoodId(
    platformContext,
    input.foodId,
  );
  if (!food) {
    throw new Error("Food not found in catalog.");
  }

  const quantityGrams = clampQuantityGrams(input.quantityGrams);
  const macros = calculateMacrosFromFood(food, quantityGrams);
  const logId = newDocId();

  await nutritionLogs.createLog(ctx, ctx.gymId, logId, {
    memberId: ctx.memberId,
    logDate,
    mealType: input.mealType,
    foodId: food.foodId,
    foodName: food.name,
    quantityGrams,
    calories: macros.calories,
    proteinGrams: macros.proteinGrams,
    carbsGrams: macros.carbsGrams,
    fatGrams: macros.fatGrams,
    fiberGrams: macros.fiberGrams,
  });

  return loadMemberNutritionDay(ctx, logDate);
}

export async function removeMemberNutritionLogEntry(
  ctx: MemberContext,
  input: { logDate: string; logId: string },
): Promise<MemberNutritionDayView> {
  const logDate = parseNutritionLogDate(input.logDate);
  const { nutritionLogs } = getRepositories();

  await nutritionLogs.deleteLog(ctx, ctx.gymId, ctx.memberId, input.logId);
  const logs = await nutritionLogs.listForMemberOnDate(
    ctx,
    ctx.gymId,
    ctx.memberId,
    logDate,
  );
  const { dietPlans } = getRepositories();
  const dietPlan = await dietPlans.findByMemberId(ctx, ctx.gymId, ctx.memberId);
  const targetCalories =
    dietPlan && dietPlan.caloriesPerDay > 0 ? dietPlan.caloriesPerDay : null;

  return buildMemberNutritionDayView(logDate, logs, targetCalories);
}
