import { getRepositories, platformContext } from "@/lib/firestore";
import type { MemberContext } from "@/lib/firestore/context";
import type {
  NutritionFoodCatalogDoc,
  NutritionLogDoc,
  NutritionMealType,
} from "@/lib/firestore/types";
import { sumMacroTotals, type NutritionMacroTotals } from "@/lib/nutrition/calculations";
import {
  NUTRITION_MERGED_CANDIDATE_LIMIT,
  NUTRITION_SEARCH_RESULT_LIMIT,
  nutritionSearchQueryMeetsMinLength,
  rankNutritionFoodSearchResults,
} from "@/lib/nutrition/food-search";
import { nutritionDisplayNameFromDoc } from "@/lib/nutrition/nutrition-canonical";
import {
  defaultNutritionLogDate,
  parseNutritionLogDate,
} from "@/lib/nutrition/date-utils";
import { NUTRITION_MEAL_TYPES } from "@/lib/nutrition/meal-types";

export { defaultNutritionLogDate, parseNutritionLogDate } from "@/lib/nutrition/date-utils";

export type NutritionLogEntryView = {
  id: string;
  mealType: NutritionMealType;
  foodId: string;
  foodName: string;
  quantityGrams: number;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams: number;
};

export type MemberNutritionDayView = {
  logDate: string;
  targetCalories: number | null;
  totals: NutritionMacroTotals;
  meals: Record<NutritionMealType, NutritionLogEntryView[]>;
  entries: NutritionLogEntryView[];
};

function toEntryView(
  doc: NutritionLogDoc & { id: string },
): NutritionLogEntryView {
  return {
    id: doc.id,
    mealType: doc.mealType,
    foodId: doc.foodId,
    foodName: doc.foodName,
    quantityGrams: doc.quantityGrams,
    calories: doc.calories,
    proteinGrams: doc.proteinGrams,
    carbsGrams: doc.carbsGrams,
    fatGrams: doc.fatGrams,
    fiberGrams: doc.fiberGrams,
  };
}

export function buildMemberNutritionDayView(
  logDate: string,
  docs: Array<NutritionLogDoc & { id: string }>,
  targetCalories: number | null,
): MemberNutritionDayView {
  const entries = docs.map(toEntryView);
  const meals = NUTRITION_MEAL_TYPES.reduce(
    (acc, mealType) => {
      acc[mealType] = entries.filter((entry) => entry.mealType === mealType);
      return acc;
    },
    {} as Record<NutritionMealType, NutritionLogEntryView[]>,
  );

  return {
    logDate,
    targetCalories,
    totals: sumMacroTotals(entries),
    meals,
    entries,
  };
}

export async function loadMemberNutritionDay(
  ctx: MemberContext,
  logDate: string,
): Promise<MemberNutritionDayView> {
  const { nutritionLogs, dietPlans } = getRepositories();
  const [logs, dietPlan] = await Promise.all([
    nutritionLogs.listForMemberOnDate(ctx, ctx.gymId, ctx.memberId, logDate),
    dietPlans.findByMemberId(ctx, ctx.gymId, ctx.memberId),
  ]);

  const targetCalories =
    dietPlan && dietPlan.caloriesPerDay > 0 ? dietPlan.caloriesPerDay : null;

  return buildMemberNutritionDayView(logDate, logs, targetCalories);
}

export type NutritionFoodSearchResult = {
  foodId: string;
  name: string;
  category: string | null;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g: number;
  servingSizeGrams: number | null;
  servingSizeLabel: string | null;
};

export type NutritionFoodDetailResult = NutritionFoodSearchResult & {
  isFavorite: boolean;
};

export function catalogDocToSearchResult(
  row: Pick<
    NutritionFoodCatalogDoc,
    | "foodId"
    | "name"
    | "nameLower"
    | "canonicalKey"
    | "displayName"
    | "category"
    | "caloriesPer100g"
    | "proteinPer100g"
    | "carbsPer100g"
    | "fatPer100g"
    | "fiberPer100g"
    | "servingSizeGrams"
    | "servingSizeLabel"
  >,
): NutritionFoodSearchResult {
  return {
    foodId: row.foodId,
    name: nutritionDisplayNameFromDoc(row),
    category: row.category,
    caloriesPer100g: row.caloriesPer100g,
    proteinPer100g: row.proteinPer100g,
    carbsPer100g: row.carbsPer100g,
    fatPer100g: row.fatPer100g,
    fiberPer100g: row.fiberPer100g,
    servingSizeGrams: row.servingSizeGrams,
    servingSizeLabel: row.servingSizeLabel,
  };
}

export async function searchNutritionFoodCatalog(
  query: string,
): Promise<NutritionFoodSearchResult[]> {
  if (!nutritionSearchQueryMeetsMinLength(query)) {
    return [];
  }
  const { nutritionFoodCatalog } = getRepositories();
  const rows = await nutritionFoodCatalog.searchByQuery(platformContext, {
    query,
    limit: NUTRITION_MERGED_CANDIDATE_LIMIT,
  });

  const ranked = rankNutritionFoodSearchResults(
    query,
    rows,
    NUTRITION_SEARCH_RESULT_LIMIT,
  );

  return ranked.map((row) => catalogDocToSearchResult(row));
}
