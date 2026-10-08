import {
  CATALOG_SEARCH_PREFIX_MIN_LENGTH,
  normalizeCatalogSearchQuery,
  tokenizeCatalogSearchQuery,
} from "@/lib/exercises/catalog-search";
import type { NutritionFoodCatalogDoc } from "@/lib/firestore/types";
import { scoreIndbFoodSearch } from "@/lib/nutrition/indb-search-boosts";
import {
  nutritionCanonicalKeyFromDoc,
  nutritionDisplayNameFromDoc,
  nutritionSearchBoostForCanonical,
} from "@/lib/nutrition/nutrition-canonical";

export const NUTRITION_SEARCH_MIN_CHARS = 2;
export const NUTRITION_SEARCH_RESULT_LIMIT = 8;
/** Max catalog rows passed into the relevance ranker after Firestore fetch. */
export const NUTRITION_MERGED_CANDIDATE_LIMIT = 150;
/** Per-token `searchPrefixes` query size (catalog has many rows sharing tokens like "sweet"). */
export const NUTRITION_PREFIX_FETCH_PER_TOKEN = 150;
/** @deprecated Use {@link NUTRITION_MERGED_CANDIDATE_LIMIT}. */
export const NUTRITION_SEARCH_CANDIDATE_LIMIT = NUTRITION_MERGED_CANDIDATE_LIMIT;

/** Firestore prefix tokens for a member food search (all query words, longest first). */
function expandNutritionSearchToken(token: string, expanded: Set<string>): void {
  if (token.length >= CATALOG_SEARCH_PREFIX_MIN_LENGTH) {
    expanded.add(token);
  }
  if (token === "ch" || token === "chi" || token === "chic") {
    expanded.add("chicken");
  }
  if (token === "do" || token === "dos") {
    expanded.add("dosa");
  }
  if (token === "id" || token === "idl") {
    expanded.add("idli");
  }
  if (token === "sa" || token === "sam") {
    expanded.add("sambar");
  }
  if (token === "up" || token === "upm") {
    expanded.add("upma");
  }
  if (token === "vad") {
    expanded.add("vada");
  }
  if (token === "upm") {
    expanded.add("upma");
  }
  if (token === "swee" || token === "swe") {
    expanded.add("sweet");
  }
  if (token === "pota" || token === "potat") {
    expanded.add("potato");
  }
}

/** Firestore prefix tokens (length >= 3) plus expansions for partial member queries. */
export function nutritionCatalogSearchTokens(query: string): string[] {
  const tokens = tokenizeCatalogSearchQuery(query);
  const expanded = new Set<string>();
  for (const token of tokens) {
    expandNutritionSearchToken(token, expanded);
  }

  const unique = [...expanded].filter(
    (token) => token.length >= CATALOG_SEARCH_PREFIX_MIN_LENGTH,
  );
  unique.sort((a, b) => b.length - a.length);
  return unique;
}

export function nutritionSearchQueryMeetsMinLength(query: string): boolean {
  const normalized = normalizeCatalogSearchQuery(query);
  return normalized.length >= NUTRITION_SEARCH_MIN_CHARS;
}

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
  const normalized = text.toLowerCase();
  const parts = normalized.split(/[\s,]+/).filter(Boolean);
  if (parts.some((part) => part.startsWith(queryToken))) return true;
  if (normalized.replace(/,/g, " ").startsWith(`${queryToken} `)) return true;
  if (normalized.replace(/,/g, " ").startsWith(`${queryToken},`)) return true;
  return false;
}

/** True when the member is searching for the edible tuber, not leaves or fried sides. */
export function isSweetPotatoTuberSearch(query: string): boolean {
  const queryTokens = tokenizeCatalogSearchQuery(query);
  if (queryTokens.length === 0) return false;
  if (queryTokens.includes("leaves")) return false;
  if (
    queryTokens.some(
      (t) => t === "fried" || t === "chips" || t === "puffs" || t === "french",
    )
  ) {
    return false;
  }
  if (queryTokens.length === 1) {
    const token = queryTokens[0]!;
    return token === "swee" || token === "sweet" || token === "swe";
  }
  return queryTokens.includes("sweet") && queryTokens.includes("potato");
}

export function isSweetPotatoLeafFood(
  doc: Pick<RankableNutritionFood, "name" | "nameLower" | "canonicalKey">,
): boolean {
  const canonicalKey = nutritionCanonicalKeyFromDoc(doc);
  if (canonicalKey === "vegetable:sweet-potato-leaves") return true;
  const name = doc.nameLower.replace(/,/g, " ");
  return /\bsweet potato(?:es)?\b/.test(name) && /\bleaves\b/.test(name);
}

/** Boost Indian CC0 staples for member-style queries (coexists with USDA). */
export function scoreIndianCc0FoodSearch(
  queryTokens: string[],
  canonicalKey: string,
  displayLower: string,
): number {
  let bonus = 40;
  const tokenSet = new Set(queryTokens);

  if (tokenSet.has("paneer") && canonicalKey === "indian:paneer") {
    bonus += 520;
  }
  if (
    (tokenSet.has("curd") || tokenSet.has("dahi")) &&
    canonicalKey === "indian:curd"
  ) {
    bonus += 500;
  }
  if (tokenSet.has("dal") && canonicalKey.startsWith("indian:dal:")) {
    bonus += 420;
  }
  if (tokenSet.has("toor") && canonicalKey === "indian:dal:toor") {
    bonus += 380;
  }
  if (tokenSet.has("moong") && canonicalKey === "indian:dal:moong") {
    bonus += 380;
  }
  if (tokenSet.has("urad") && canonicalKey === "indian:dal:urad") {
    bonus += 380;
  }
  if (tokenSet.has("chana") && canonicalKey === "indian:dal:chana") {
    bonus += 360;
  }
  if (tokenSet.has("masoor") && canonicalKey === "indian:dal:masoor") {
    bonus += 360;
  }
  if (tokenSet.has("rice") && canonicalKey.startsWith("indian:rice:")) {
    bonus += 280;
  }
  if (tokenSet.has("ragi") && canonicalKey === "indian:millet:ragi") {
    bonus += 400;
  }
  if (tokenSet.has("poha") && canonicalKey === "indian:rice:poha") {
    bonus += 400;
  }
  if (
    (tokenSet.has("atta") || tokenSet.has("chapati")) &&
    canonicalKey === "indian:wheat:atta"
  ) {
    bonus += tokenSet.has("chapati") ? 620 : 200;
  }
  return bonus;
}

export function isProcessedSweetPotatoFood(
  doc: Pick<RankableNutritionFood, "name" | "nameLower" | "canonicalKey">,
): boolean {
  const canonicalKey = nutritionCanonicalKeyFromDoc(doc);
  if (canonicalKey === "potato:sweet:fried") return true;
  const name = doc.nameLower.replace(/,/g, " ");
  if (!/\bsweet potato(?:es)?\b/.test(name)) return false;
  return /\bfrench fried|fried|puffs|chips\b/.test(name);
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

  if (isSweetPotatoTuberSearch(query)) {
    if (isSweetPotatoLeafFood(doc) || isProcessedSweetPotatoFood(doc)) {
      return false;
    }
  }

  if (
    queryTokens.includes("chapati") &&
    canonicalKey === "indian:wheat:atta"
  ) {
    return true;
  }

  if (queryTokens.length === 1) {
    const token = queryTokens[0]!;
    if (token.length === 2) {
      if (token === "ch") {
        return (
          canonicalKey.startsWith("chicken:") ||
          /\bchicken\b/i.test(name) ||
          display.startsWith("chicken")
        );
      }
      if (token === "do") {
        return /\bdosa\b/i.test(name) || display.startsWith("dosa");
      }
      if (token === "id") {
        return /\bidli\b/i.test(name) || display.startsWith("idli");
      }
      if (token === "sa") {
        return /\bsambar\b/i.test(name) || display.startsWith("sambar");
      }
      if (token === "up") {
        return /\bupma\b/i.test(name) || display.includes("upma");
      }
      if (token === "va") {
        return /\bvada\b/i.test(name) || display.includes("vada");
      }
    }
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
    if (tokenMatchesFoodText(token, display) || tokenMatchesFoodText(token, name)) {
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
  if (
    (canonicalKey === "potato:sweet:raw" ||
      canonicalKey === "potato:sweet:cooked") &&
    isSweetPotatoTuberSearch(query)
  ) {
    score += 750;
    if (canonicalKey === "potato:sweet:raw") {
      score += 120;
    }
  }

  if (canonicalKey.startsWith("indian:")) {
    score += scoreIndianCc0FoodSearch(queryTokens, canonicalKey, displayLower);
  }
  if (canonicalKey.startsWith("indb:")) {
    score += scoreIndbFoodSearch(
      queryTokens,
      canonicalKey,
      displayLower,
      nameLower,
      "",
    );
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
    const nameParts = nameLower.replace(/,/g, " ").split(/\s+/);
    if (nameParts.some((part) => part.startsWith(token))) {
      score += 100;
      continue;
    }
    const displayParts = displayLower.split(/\s+/);
    if (displayParts.some((part) => part.startsWith(token))) {
      score += 110;
      continue;
    }
    score -= 250;
  }

  if (queryTokens.length >= 2) {
    const phrase = queryTokens.join(" ");
    if (displayLower.includes(phrase) || nameLower.replace(/,/g, " ").includes(phrase)) {
      score += 400;
    }
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

  if (
    queryTokens.includes("chapati") &&
    canonicalKey !== "indian:wheat:atta" &&
    !displayLower.includes("chapati") &&
    !nameLower.replace(/,/g, " ").includes("chapati")
  ) {
    score -= 900;
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
