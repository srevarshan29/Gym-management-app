import { getRepositories, newDocId, platformContext } from "@/lib/firestore";
import type { MemberContext } from "@/lib/firestore/context";
import type {
  NutritionFoodCatalogDoc,
  NutritionLogDoc,
  NutritionMealType,
} from "@/lib/firestore/types";
import type { DocWithId } from "@/lib/firestore/repositories/base";
import {
  calculateMacrosFromFood,
  clampQuantityGrams,
} from "@/lib/nutrition/calculations";
import {
  loadMemberNutritionDay,
  parseNutritionLogDate,
  type MemberNutritionDayView,
} from "@/lib/nutrition/member-day";
import {
  buildMemberNutritionDayFromContext,
  loadMemberNutritionDayContext,
} from "@/lib/nutrition/nutrition-day-context";
import { recordMemberNutritionFoodLogged } from "@/lib/nutrition/member-food-shortcut-operations";

async function macrosForFoodDoc(
  food: Pick<
    NutritionFoodCatalogDoc,
    | "caloriesPer100g"
    | "proteinPer100g"
    | "carbsPer100g"
    | "fatPer100g"
    | "fiberPer100g"
  >,
  quantityGrams: number,
) {
  const grams = clampQuantityGrams(quantityGrams);
  const macros = calculateMacrosFromFood(food, grams);
  return { grams, macros };
}

async function macrosForFoodQuantity(foodId: string, quantityGrams: number) {
  const { nutritionFoodCatalog } = getRepositories();
  const food = await nutritionFoodCatalog.getByFoodId(platformContext, foodId);
  if (!food) {
    throw new Error("Food not found in catalog.");
  }
  const { grams, macros } = await macrosForFoodDoc(food, quantityGrams);
  return { food, grams, macros };
}

function applyLogMacroUpdate(
  logs: Array<{ id: string } & NutritionLogDoc>,
  logId: string,
  food: DocWithId<NutritionFoodCatalogDoc>,
  grams: number,
  macros: ReturnType<typeof calculateMacrosFromFood>,
) {
  return logs.map((row) =>
    row.id === logId
      ? {
          ...row,
          quantityGrams: grams,
          calories: macros.calories,
          proteinGrams: macros.proteinGrams,
          carbsGrams: macros.carbsGrams,
          fatGrams: macros.fatGrams,
          fiberGrams: macros.fiberGrams,
        }
      : row,
  );
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

  const dayContext = await loadMemberNutritionDayContext(ctx, logDate);
  const { food, grams, macros } = await macrosForFoodQuantity(
    input.foodId,
    input.quantityGrams,
  );

  const existing = dayContext.logs.find(
    (row) => row.foodId === food.foodId && row.mealType === input.mealType,
  );

  if (existing) {
    const mergedGrams = existing.quantityGrams + grams;
    const { grams: nextGrams, macros: nextMacros } = await macrosForFoodDoc(
      food,
      mergedGrams,
    );
    await nutritionLogs.updateLogMacros(
      ctx,
      ctx.gymId,
      ctx.memberId,
      existing.id,
      {
        quantityGrams: nextGrams,
        calories: nextMacros.calories,
        proteinGrams: nextMacros.proteinGrams,
        carbsGrams: nextMacros.carbsGrams,
        fatGrams: nextMacros.fatGrams,
        fiberGrams: nextMacros.fiberGrams,
      },
    );
    await recordMemberNutritionFoodLogged(ctx, food.foodId);
    const logs = applyLogMacroUpdate(
      dayContext.logs,
      existing.id,
      food,
      nextGrams,
      nextMacros,
    );
    return buildMemberNutritionDayFromContext(dayContext, logs);
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

  await recordMemberNutritionFoodLogged(ctx, food.foodId);
  const logs = [
    ...dayContext.logs,
    {
      id: logId,
      gymId: ctx.gymId,
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
      createdAt: {} as NutritionLogDoc["createdAt"],
      updatedAt: {} as NutritionLogDoc["updatedAt"],
    },
  ];
  return buildMemberNutritionDayFromContext(dayContext, logs);
}

export type AddMemberNutritionLogItem = {
  foodId: string;
  quantityGrams: number;
};

/**
 * Add multiple foods in one server round trip (single day context + batched catalog reads).
 */
export async function addMemberNutritionLogEntries(
  ctx: MemberContext,
  input: {
    logDate: string;
    mealType: NutritionMealType;
    items: AddMemberNutritionLogItem[];
  },
): Promise<MemberNutritionDayView> {
  const logDate = parseNutritionLogDate(input.logDate);
  if (input.items.length === 0) {
    return loadMemberNutritionDay(ctx, logDate);
  }

  const { nutritionLogs, nutritionFoodCatalog } = getRepositories();
  const dayContext = await loadMemberNutritionDayContext(ctx, logDate);

  const uniqueFoodIds = [...new Set(input.items.map((item) => item.foodId))];
  const catalogRows = await nutritionFoodCatalog.getByFoodIds(
    platformContext,
    uniqueFoodIds,
  );
  const foodById = new Map(catalogRows.map((row) => [row.foodId, row]));

  let logs = [...dayContext.logs];
  const recentFoodIds: string[] = [];

  for (const item of input.items) {
    const food = foodById.get(item.foodId);
    if (!food) {
      throw new Error("Food not found in catalog.");
    }
    const { grams, macros } = await macrosForFoodDoc(food, item.quantityGrams);

    const existing = logs.find(
      (row) => row.foodId === food.foodId && row.mealType === input.mealType,
    );

    if (existing) {
      const mergedGrams = existing.quantityGrams + grams;
      const { grams: nextGrams, macros: nextMacros } = await macrosForFoodDoc(
        food,
        mergedGrams,
      );
      await nutritionLogs.updateLogMacros(
        ctx,
        ctx.gymId,
        ctx.memberId,
        existing.id,
        {
          quantityGrams: nextGrams,
          calories: nextMacros.calories,
          proteinGrams: nextMacros.proteinGrams,
          carbsGrams: nextMacros.carbsGrams,
          fatGrams: nextMacros.fatGrams,
          fiberGrams: nextMacros.fiberGrams,
        },
      );
      logs = applyLogMacroUpdate(
        logs,
        existing.id,
        food,
        nextGrams,
        nextMacros,
      );
    } else {
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
      logs = [
        ...logs,
        {
          id: logId,
          gymId: ctx.gymId,
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
          createdAt: {} as NutritionLogDoc["createdAt"],
          updatedAt: {} as NutritionLogDoc["updatedAt"],
        },
      ];
    }
    recentFoodIds.push(food.foodId);
  }

  await Promise.all(
    [...new Set(recentFoodIds)].map((foodId) =>
      recordMemberNutritionFoodLogged(ctx, foodId),
    ),
  );

  return buildMemberNutritionDayFromContext(dayContext, logs);
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

  const dayContext = await loadMemberNutritionDayContext(ctx, logDate);
  const existing = dayContext.logs.find((row) => row.id === input.logId);
  if (!existing || existing.memberId !== ctx.memberId) {
    throw new Error("Log entry not found.");
  }

  const { nutritionFoodCatalog } = getRepositories();
  const food = await nutritionFoodCatalog.getByFoodId(
    platformContext,
    existing.foodId,
  );
  if (!food) {
    throw new Error("Food not found in catalog.");
  }

  const { grams, macros } = await macrosForFoodDoc(food, input.quantityGrams);

  await nutritionLogs.updateLogMacros(ctx, ctx.gymId, ctx.memberId, input.logId, {
    quantityGrams: grams,
    calories: macros.calories,
    proteinGrams: macros.proteinGrams,
    carbsGrams: macros.carbsGrams,
    fatGrams: macros.fatGrams,
    fiberGrams: macros.fiberGrams,
  });

  const logs = applyLogMacroUpdate(
    dayContext.logs,
    input.logId,
    food,
    grams,
    macros,
  );
  return buildMemberNutritionDayFromContext(dayContext, logs);
}

export async function removeMemberNutritionLogEntry(
  ctx: MemberContext,
  input: { logDate: string; logId: string },
): Promise<MemberNutritionDayView> {
  const logDate = parseNutritionLogDate(input.logDate);
  const { nutritionLogs } = getRepositories();

  const dayContext = await loadMemberNutritionDayContext(ctx, logDate);
  await nutritionLogs.deleteLog(ctx, ctx.gymId, ctx.memberId, input.logId);
  const logs = dayContext.logs.filter((row) => row.id !== input.logId);
  return buildMemberNutritionDayFromContext(dayContext, logs);
}
