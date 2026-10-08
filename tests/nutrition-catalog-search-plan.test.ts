import { describe, expect, it } from "vitest";

import {
  countPlannedFirestoreQueries,
  planNutritionCatalogSearchFetch,
} from "@/lib/nutrition/nutrition-catalog-search-plan";

describe("nutrition catalog search fetch plan", () => {
  it("uses only searchPrefixes for exact 3+ character single-token queries like idli", () => {
    const plan = planNutritionCatalogSearchFetch("idli");
    expect(plan.nameLowerPrefixes).toEqual([]);
    expect(plan.prefixTokens).toContain("idli");
    expect(countPlannedFirestoreQueries(plan)).toBe(1);
  });

  it("uses nameLower and expanded prefix for 2-character partial id", () => {
    const plan = planNutritionCatalogSearchFetch("id");
    expect(plan.nameLowerPrefixes).toContain("id");
    expect(plan.prefixTokens).toContain("idli");
    expect(countPlannedFirestoreQueries(plan)).toBe(2);
  });

  it("keeps nameLower for sweet potato tuber partial swee", () => {
    const plan = planNutritionCatalogSearchFetch("swee");
    expect(plan.nameLowerPrefixes).toContain("swee");
    expect(plan.prefixTokens).toContain("sweet");
    expect(plan.mergedCap).toBeGreaterThanOrEqual(100);
    expect(countPlannedFirestoreQueries(plan)).toBeGreaterThanOrEqual(2);
  });

  it("uses smaller limits for simple dish tokens", () => {
    const plan = planNutritionCatalogSearchFetch("dosa");
    expect(plan.perTokenLimit).toBeLessThanOrEqual(32);
    expect(plan.mergedCap).toBeLessThanOrEqual(48);
    expect(countPlannedFirestoreQueries(plan)).toBe(1);
  });

  it("retains broader fetch for sweet potato phrase", () => {
    const plan = planNutritionCatalogSearchFetch("sweet potato");
    expect(plan.mergedCap).toBe(150);
    expect(plan.perTokenLimit).toBe(150);
    expect(countPlannedFirestoreQueries(plan)).toBeGreaterThanOrEqual(3);
  });
});
