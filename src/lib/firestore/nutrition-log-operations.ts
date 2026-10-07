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

async function macrosForFoodQuantity(foodId: string, quantityGrams: number) {
  const { nutritionFoodCatalog } = getRepositories();
  const food = await nutritionFoodCatalog.getByFoodId(platformContext, foodId);
  if (!food) {
    throw new Error("Food not found in catalog.");
  }
  const grams = clampQuantityGrams(quantityGrams);
  const macros = calculateMacrosFromFood(food, grams);
  return { food, grams, macros };
}

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
  const { nutritionLogs } = getRepositories();

  const { food, grams, macros } = await macrosForFoodQuantity(
    input.foodId,
    input.quantityGrams,
  );

  const existingLogs = await nutritionLogs.listForMemberOnDate(
    ctx,
    ctx.gymId,
    ctx.memberId,
    logDate,
  );
  const existing = existingLogs.find(
    (row) => row.foodId === food.foodId && row.mealType === input.mealType,
  );

  if (existing) {
    return updateMemberNutritionLogEntry(ctx, {
      logDate,
      logId: existing.id,
      quantityGrams: existing.quantityGrams + grams,
    });
  }

  const logId = newDocId();
  await nutritionLogs.createLog(ctx, ctx.gymId, logId, {
    memberId: ctx.memberId,
    logDate,
    mealType: input.mealType,
    foodId: food.foodId,
    foodName: food.name,
    quantityGrams: grams,
    calories: macros.calories,
    proteinGrams: macros.proteinGrams,
    carbsGrams: macros.carbsGrams,
    fatGrams: macros.fatGrams,
    fiberGrams: macros.fiberGrams,
  });

  return loadMemberNutritionDay(ctx, logDate);
}

export async function updateMemberNutritionLogEntry(
  ctx: MemberContext,
  input: {
    logDate: string;
    logId: string;
    quantityGrams: number;
  },
): Promise<MemberNutritionDayView> {
  const logDate = parseNutritionLogDate(input.logDate);
  const { nutritionLogs } = getRepositories();

  const existing = await nutritionLogs.getById(ctx, ctx.gymId, input.logId);
  if (!existing || existing.memberId !== ctx.memberId) {
    throw new Error("Log entry not found.");
  }

  const { grams, macros } = await macrosForFoodQuantity(
    existing.foodId,
    input.quantityGrams,
  );

  await nutritionLogs.updateLogMacros(ctx, ctx.gymId, ctx.memberId, input.logId, {
    quantityGrams: grams,
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
