import { getRepositories, platformContext } from "@/lib/firestore";
import type { MemberContext } from "@/lib/firestore/context";
import {
  memberFoodDocToShortcutRow,
  NUTRITION_MAX_FAVORITE_FOODS,
  NUTRITION_MAX_RECENT_FOODS,
  recentFoodIdsExcludingFavorites,
  selectFavoriteFoodIds,
  selectRecentFoodIds,
} from "@/lib/nutrition/member-food-shortcuts";
import {
  catalogDocToSearchResult,
  type NutritionFoodSearchResult,
} from "@/lib/nutrition/member-day";

export type NutritionAddFoodShortcuts = {
  recent: NutritionFoodSearchResult[];
  favorites: NutritionFoodSearchResult[];
};

async function hydrateFoodsByIds(
  foodIds: string[],
): Promise<NutritionFoodSearchResult[]> {
  if (foodIds.length === 0) return [];
  const { nutritionFoodCatalog } = getRepositories();
  const rows = await nutritionFoodCatalog.getByFoodIds(
    platformContext,
    foodIds,
  );
  return rows.map((row) => catalogDocToSearchResult(row));
}

function orderByFoodIds(
  foods: NutritionFoodSearchResult[],
  foodIds: string[],
): NutritionFoodSearchResult[] {
  const byId = new Map(foods.map((f) => [f.foodId, f]));
  return foodIds
    .map((id) => byId.get(id))
    .filter((f): f is NutritionFoodSearchResult => f != null);
}

export async function loadMemberNutritionAddFoodShortcuts(
  ctx: MemberContext,
): Promise<NutritionAddFoodShortcuts> {
  const { nutritionMemberFoods } = getRepositories();
  const [recentDocs, favoriteDocs] = await Promise.all([
    nutritionMemberFoods.listRecentForMember(
      ctx,
      ctx.gymId,
      ctx.memberId,
      NUTRITION_MAX_RECENT_FOODS,
    ),
    nutritionMemberFoods.listFavoritesForMember(
      ctx,
      ctx.gymId,
      ctx.memberId,
      NUTRITION_MAX_FAVORITE_FOODS,
    ),
  ]);

  const favoriteIds = selectFavoriteFoodIds(
    favoriteDocs.map(memberFoodDocToShortcutRow),
    NUTRITION_MAX_FAVORITE_FOODS,
  );
  const recentIds = recentFoodIdsExcludingFavorites(
    selectRecentFoodIds(
      recentDocs.map(memberFoodDocToShortcutRow),
      NUTRITION_MAX_RECENT_FOODS,
    ),
    favoriteIds,
  );

  const allIds = [...new Set([...favoriteIds, ...recentIds])];
  const hydrated = await hydrateFoodsByIds(allIds);

  return {
    favorites: orderByFoodIds(hydrated, favoriteIds),
    recent: orderByFoodIds(hydrated, recentIds),
  };
}

export async function recordMemberNutritionFoodLogged(
  ctx: MemberContext,
  foodId: string,
): Promise<void> {
  const { nutritionMemberFoods } = getRepositories();
  await nutritionMemberFoods.recordFoodLogged(
    ctx,
    ctx.gymId,
    ctx.memberId,
    foodId,
  );
}

export async function setMemberNutritionFoodFavorite(
  ctx: MemberContext,
  foodId: string,
  isFavorite: boolean,
): Promise<boolean> {
  const { nutritionMemberFoods, nutritionFoodCatalog } = getRepositories();
  const food = await nutritionFoodCatalog.getByFoodId(platformContext, foodId);
  if (!food) {
    throw new Error("Food not found in catalog.");
  }
  await nutritionMemberFoods.setFavorite(
    ctx,
    ctx.gymId,
    ctx.memberId,
    foodId,
    isFavorite,
  );
  return isFavorite;
}

export async function isMemberNutritionFoodFavorite(
  ctx: MemberContext,
  foodId: string,
): Promise<boolean> {
  const { nutritionMemberFoods } = getRepositories();
  const doc = await nutritionMemberFoods.getForMemberFood(
    ctx,
    ctx.gymId,
    ctx.memberId,
    foodId,
  );
  return doc?.isFavorite === true;
}
