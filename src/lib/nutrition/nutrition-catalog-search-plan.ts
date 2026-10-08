import {
  CATALOG_SEARCH_PREFIX_MIN_LENGTH,
  normalizeCatalogSearchQuery,
  tokenizeCatalogSearchQuery,
} from "@/lib/exercises/catalog-search";
import {
  isSweetPotatoTuberSearch,
  NUTRITION_MERGED_CANDIDATE_LIMIT,
  NUTRITION_PREFIX_FETCH_PER_TOKEN,
  NUTRITION_SEARCH_MIN_CHARS,
  nutritionCatalogSearchTokens,
} from "@/lib/nutrition/food-search";

export type NutritionCatalogFetchPlan = {
  nameLowerPrefixes: string[];
  prefixTokens: string[];
  mergedCap: number;
  perTokenLimit: number;
};

function uniqueSorted(prefixes: string[]): string[] {
  return [...new Set(prefixes.map((p) => p.trim().toLowerCase()).filter(Boolean))];
}

/**
 * Plans Firestore catalog fetches: avoid redundant nameLower + searchPrefixes for 3+ char tokens.
 */
export function planNutritionCatalogSearchFetch(
  query: string,
): NutritionCatalogFetchPlan {
  const normalizedQuery = normalizeCatalogSearchQuery(query);
  const queryTokens = tokenizeCatalogSearchQuery(query);
  const prefixTokens = nutritionCatalogSearchTokens(query);
  const sweetPotato = isSweetPotatoTuberSearch(query);
  const simpleSingleToken =
    queryTokens.length === 1 && !sweetPotato && queryTokens[0]!.length <= 12;

  const mergedCap = sweetPotato
    ? NUTRITION_MERGED_CANDIDATE_LIMIT
    : simpleSingleToken
      ? 48
      : Math.min(100, NUTRITION_MERGED_CANDIDATE_LIMIT);

  const perTokenLimit = sweetPotato
    ? NUTRITION_PREFIX_FETCH_PER_TOKEN
    : simpleSingleToken
      ? 32
      : Math.min(80, NUTRITION_PREFIX_FETCH_PER_TOKEN);

  const nameLowerPrefixes: string[] = [];
  const primary = queryTokens[0] ?? "";

  if (queryTokens.length > 1 && normalizedQuery.length >= NUTRITION_SEARCH_MIN_CHARS) {
    nameLowerPrefixes.push(normalizedQuery);
  }

  for (const token of queryTokens) {
    if (
      token.length >= NUTRITION_SEARCH_MIN_CHARS &&
      token.length < CATALOG_SEARCH_PREFIX_MIN_LENGTH
    ) {
      nameLowerPrefixes.push(token);
    }
  }

  const primaryUsesPrefixIndex =
    primary.length >= CATALOG_SEARCH_PREFIX_MIN_LENGTH &&
    prefixTokens.includes(primary);

  if (
    queryTokens.length === 1 &&
    primary.length >= CATALOG_SEARCH_PREFIX_MIN_LENGTH &&
    primaryUsesPrefixIndex &&
    !sweetPotato
  ) {
    return {
      nameLowerPrefixes: uniqueSorted(nameLowerPrefixes),
      prefixTokens,
      mergedCap,
      perTokenLimit,
    };
  }

  if (
    normalizedQuery.length >= NUTRITION_SEARCH_MIN_CHARS &&
    !nameLowerPrefixes.includes(normalizedQuery)
  ) {
    nameLowerPrefixes.push(normalizedQuery);
  }

  return {
    nameLowerPrefixes: uniqueSorted(nameLowerPrefixes),
    prefixTokens,
    mergedCap,
    perTokenLimit,
  };
}

export function countPlannedFirestoreQueries(plan: NutritionCatalogFetchPlan): number {
  return plan.nameLowerPrefixes.length + plan.prefixTokens.length;
}
