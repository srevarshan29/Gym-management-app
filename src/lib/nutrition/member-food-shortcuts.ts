import type { DocWithId } from "@/lib/firestore/repositories/base";
import type { NutritionMemberFoodDoc } from "@/lib/firestore/types";

export const NUTRITION_MAX_RECENT_FOODS = 6;
export const NUTRITION_MAX_FAVORITE_FOODS = 6;

export type MemberFoodShortcutRow = {
  foodId: string;
  lastLoggedAtMs: number | null;
  isFavorite: boolean;
  favoritedAtMs: number | null;
};

export function memberFoodDocToShortcutRow(
  doc: DocWithId<NutritionMemberFoodDoc>,
): MemberFoodShortcutRow {
  return {
    foodId: doc.foodId,
    lastLoggedAtMs: doc.lastLoggedAt?.toMillis() ?? null,
    isFavorite: doc.isFavorite === true,
    favoritedAtMs: doc.favoritedAt?.toMillis() ?? null,
  };
}

/** Unique foodIds, newest logged first, capped at max. */
export function selectRecentFoodIds(
  rows: MemberFoodShortcutRow[],
  max = NUTRITION_MAX_RECENT_FOODS,
): string[] {
  const sorted = [...rows]
    .filter((row) => row.lastLoggedAtMs != null)
    .sort((a, b) => (b.lastLoggedAtMs ?? 0) - (a.lastLoggedAtMs ?? 0));

  const seen = new Set<string>();
  const result: string[] = [];
  for (const row of sorted) {
    if (seen.has(row.foodId)) continue;
    seen.add(row.foodId);
    result.push(row.foodId);
    if (result.length >= max) break;
  }
  return result;
}

/** Favorite foodIds newest first, capped at max. */
export function selectFavoriteFoodIds(
  rows: MemberFoodShortcutRow[],
  max = NUTRITION_MAX_FAVORITE_FOODS,
): string[] {
  const sorted = rows
    .filter((row) => row.isFavorite)
    .sort((a, b) => (b.favoritedAtMs ?? 0) - (a.favoritedAtMs ?? 0));

  const seen = new Set<string>();
  const result: string[] = [];
  for (const row of sorted) {
    if (seen.has(row.foodId)) continue;
    seen.add(row.foodId);
    result.push(row.foodId);
    if (result.length >= max) break;
  }
  return result;
}

/** Recent list without foods already shown in Favorites. */
export function recentFoodIdsExcludingFavorites(
  recentIds: string[],
  favoriteIds: string[],
): string[] {
  const favorites = new Set(favoriteIds);
  return recentIds.filter((id) => !favorites.has(id));
}
