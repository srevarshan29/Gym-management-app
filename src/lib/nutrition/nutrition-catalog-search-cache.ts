import type { NutritionFoodCatalogDoc } from "@/lib/firestore/types";
import type { DocWithId } from "@/lib/firestore/repositories/base";

const CACHE_TTL_MS = 45_000;
const CACHE_MAX_ENTRIES = 120;

type CacheEntry = {
  expiresAt: number;
  candidates: DocWithId<NutritionFoodCatalogDoc>[];
};

const catalogCandidateCache = new Map<string, CacheEntry>();

export function getCachedNutritionCatalogCandidates(
  cacheKey: string,
): DocWithId<NutritionFoodCatalogDoc>[] | null {
  const entry = catalogCandidateCache.get(cacheKey);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    catalogCandidateCache.delete(cacheKey);
    return null;
  }
  return entry.candidates;
}

export function setCachedNutritionCatalogCandidates(
  cacheKey: string,
  candidates: DocWithId<NutritionFoodCatalogDoc>[],
): void {
  if (catalogCandidateCache.size >= CACHE_MAX_ENTRIES) {
    const oldest = catalogCandidateCache.keys().next().value;
    if (oldest) catalogCandidateCache.delete(oldest);
  }
  catalogCandidateCache.set(cacheKey, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    candidates,
  });
}

/** Test-only */
export function clearNutritionCatalogSearchCache(): void {
  catalogCandidateCache.clear();
}
