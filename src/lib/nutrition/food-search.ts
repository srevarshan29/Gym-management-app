import {
  normalizeCatalogSearchQuery,
  tokenizeCatalogSearchQuery,
} from "@/lib/exercises/catalog-search";
import type { NutritionFoodCatalogDoc } from "@/lib/firestore/types";
import {
  nutritionCanonicalKeyFromDoc,
  nutritionDisplayNameFromDoc,
  nutritionSearchBoostForCanonical,
} from "@/lib/nutrition/nutrition-canonical";

export const NUTRITION_SEARCH_RESULT_LIMIT = 8;
export const NUTRITION_SEARCH_CANDIDATE_LIMIT = 48;

export type RankableNutritionFood = Pick<
  NutritionFoodCatalogDoc,
  | "foodId"
  | "name"
  | "nameLower"
  | "canonicalKey"
  | "displayName"
  | "searchBoost"
>;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function wordBoundaryIncludes(haystack: string, token: string): boolean {
  if (!token) return false;
  const re = new RegExp(`\\b${escapeRegExp(token)}\\b`, "i");
  return re.test(haystack);
}

function tokenMatchesFoodText(queryToken: string, text: string): boolean {
  if (wordBoundaryIncludes(text, queryToken)) return true;
  if (queryToken === "egg" && /\beggs\b/i.test(text)) return true;
  return false;
}

/**
 * Drop prefix-index false positives (e.g. bread/cereals that only contain "egg" incidentally).
 */
export function passesNutritionSearchRelevanceGate(
  query: string,
  doc: RankableNutritionFood,
): boolean {
  const queryTokens = tokenizeCatalogSearchQuery(query);
  if (queryTokens.length === 0) return false;

  const display = nutritionDisplayNameFromDoc(doc).toLowerCase();
  const name = doc.nameLower.replace(/,/g, " ");
  const canonicalKey = nutritionCanonicalKeyFromDoc(doc);

  if (queryTokens.length === 1) {
    const token = queryTokens[0]!;
    if (canonicalKey === "vegetable:eggplant" && token === "egg") {
      return false;
    }
    if (token === "egg") {
      return (
        canonicalKey === "egg:whole:raw" ||
        canonicalKey === "egg:white:raw" ||
        canonicalKey === "egg:yolk:raw" ||
        canonicalKey === "egg:whole:cooked" ||
        canonicalKey === "egg:white:cooked" ||
        canonicalKey === "egg:yolk:cooked"
      );
    }
    if (canonicalKey.startsWith(`${token}:`)) {
      return true;
    }
    if (tokenMatchesFoodText(token, display)) {
      return true;
    }
    if (name.startsWith(`${token} `) || name.startsWith(`${token},`)) {
      return true;
    }
    return false;
  }

  return queryTokens.every(
    (token) =>
      tokenMatchesFoodText(token, display) ||
      tokenMatchesFoodText(token, name) ||
      canonicalKey.startsWith(`${token}:`),
  );
}

/**
 * Score a single catalog row for a member food search query (higher = more relevant).
 */
export function scoreNutritionFoodSearch(
  query: string,
  doc: RankableNutritionFood,
): number {
  const normalizedQuery = normalizeCatalogSearchQuery(query);
  const queryTokens = tokenizeCatalogSearchQuery(query);
  if (!normalizedQuery || queryTokens.length === 0) return -Infinity;

  const displayName = nutritionDisplayNameFromDoc(doc);
  const displayLower = displayName.toLowerCase();
  const nameLower = doc.nameLower;
  const canonicalKey = nutritionCanonicalKeyFromDoc(doc);
  const boost =
    doc.searchBoost ?? nutritionSearchBoostForCanonical(canonicalKey);

  let score = boost * 25;

  const firstQueryToken = queryTokens[0] ?? "";
  if (
    firstQueryToken.length >= 3 &&
    canonicalKey.startsWith(`${firstQueryToken}:`)
  ) {
    score += 320;
  }
  if (canonicalKey === "egg:whole:raw" && firstQueryToken === "egg") {
    score += 500;
  }
  if (canonicalKey === "banana:raw" && firstQueryToken === "banana") {
    score += 80;
  }
  if (
    canonicalKey.startsWith("chicken:breast:") &&
    firstQueryToken === "chicken"
  ) {
    score += 60;
  }

  if (displayLower === normalizedQuery) score += 1200;
  if (nameLower === normalizedQuery) score += 1100;

  if (displayLower.startsWith(normalizedQuery)) {
    score += normalizedQuery.length <= 4 ? 0 : 700;
  }
  if (nameLower.startsWith(normalizedQuery)) {
    const usdaLeading = new RegExp(
      `^${escapeRegExp(normalizedQuery)}\\s*,`,
    );
    score += usdaLeading.test(nameLower) ? 180 : 600;
  }

  const displayWords = displayLower.split(/\s+/);
  const firstDisplayWord = displayWords[0] ?? "";
  if (firstDisplayWord === firstQueryToken) score += 450;
  if (displayWords.some((w) => w === firstQueryToken)) score += 200;

  for (const token of queryTokens) {
    if (wordBoundaryIncludes(displayLower, token)) {
      score += 180;
      continue;
    }
    if (displayLower.startsWith(token)) {
      score += 120;
      continue;
    }
    if (wordBoundaryIncludes(nameLower, token)) {
      score += 90;
      continue;
    }
    if (nameLower.includes(token)) {
      score += 30;
      continue;
    }
    score -= 250;
  }

  if (
    queryTokens.length === 1 &&
    queryTokens[0] === "egg" &&
    (/\beggplant\b/.test(nameLower) || canonicalKey === "vegetable:eggplant")
  ) {
    score -= 10_000;
  }

  if (
    queryTokens.length === 1 &&
    queryTokens[0]!.length <= 4 &&
    /\beggplant\b/.test(nameLower) &&
    !wordBoundaryIncludes(nameLower, "egg")
  ) {
    score -= 500;
  }

  if (
    normalizedQuery.length <= 5 &&
    /\bfrozen|dried|pasteurized|powder|dehydrated|infant|baby\b/.test(nameLower)
  ) {
    score -= 120;
  }

  if (/\bbabyfood\b/.test(nameLower)) {
    score -= 8000;
  }

  if (firstQueryToken === "egg") {
    if (displayLower === "egg" && canonicalKey !== "egg:whole:raw") {
      score -= 2500;
    }
    if (displayLower === "eggs" && canonicalKey !== "egg:whole:raw") {
      score -= 1800;
    }
    if (
      canonicalKey !== "egg:whole:raw" &&
      canonicalKey !== "egg:white:raw" &&
      canonicalKey !== "egg:yolk:raw" &&
      canonicalKey !== "egg:whole:cooked" &&
      !canonicalKey.startsWith("egg:whole:") &&
      !canonicalKey.startsWith("egg:white:") &&
      !canonicalKey.startsWith("egg:yolk:")
    ) {
      score -= 600;
    }
  }

  if (firstQueryToken === "egg" && canonicalKey.startsWith("egg:other:")) {
    score -= 4000;
  }
  if (
    firstQueryToken === "egg" &&
    (canonicalKey === "egg:whole:dried" ||
      canonicalKey === "egg:whole:processed" ||
      canonicalKey === "egg:white:processed")
  ) {
    score -= 800;
  }

  return score;
}

/**
 * Rank, dedupe by canonical identity, and cap results for member search.
 */
export function rankNutritionFoodSearchResults<T extends RankableNutritionFood>(
  query: string,
  candidates: T[],
  limit = NUTRITION_SEARCH_RESULT_LIMIT,
): T[] {
  const filtered = candidates.filter((doc) =>
    passesNutritionSearchRelevanceGate(query, doc),
  );

  const scored = filtered
    .map((doc) => ({
      doc,
      score: scoreNutritionFoodSearch(query, doc),
    }))
    .filter((row) => row.score > -5000)
    .sort((a, b) => b.score - a.score);

  const seenCanonical = new Set<string>();
  const seenDisplay = new Set<string>();
  const results: T[] = [];

  for (const { doc, score } of scored) {
    if (results.length >= limit) break;
    const key = nutritionCanonicalKeyFromDoc(doc);
    if (seenCanonical.has(key)) continue;
    if (score < -100) continue;

    const displayKey = nutritionDisplayNameFromDoc(doc).toLowerCase();
    if (seenDisplay.has(displayKey)) continue;

    seenCanonical.add(key);
    seenDisplay.add(displayKey);
    results.push(doc);
  }

  return results;
}
