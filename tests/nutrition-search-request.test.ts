import { describe, expect, it } from "vitest";

import { shouldApplyNutritionSearchResponse } from "@/lib/nutrition/nutrition-search-request";

describe("nutrition search request sequencing", () => {
  it("applies only the latest in-flight search response", () => {
    expect(shouldApplyNutritionSearchResponse(1, 2)).toBe(false);
    expect(shouldApplyNutritionSearchResponse(2, 2)).toBe(true);
    expect(shouldApplyNutritionSearchResponse(1, 1)).toBe(true);
  });

  it("rejects zero sequence", () => {
    expect(shouldApplyNutritionSearchResponse(0, 0)).toBe(false);
  });
});
