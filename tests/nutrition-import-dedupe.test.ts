import { describe, expect, it } from "vitest";

import {
  dedupeUsdaCatalogCandidates,
  parseUsdaFoodRow,
} from "@/lib/nutrition/usda-catalog";

function row(
  fdcId: number,
  description: string,
  calories = 150,
): {
  fdcId: number;
  description: string;
  foodNutrients: { nutrient: { id: number }; amount: number }[];
} {
  return {
    fdcId,
    description,
    foodNutrients: [
      { nutrient: { id: 1008 }, amount: calories },
      { nutrient: { id: 1003 }, amount: 12 },
      { nutrient: { id: 1005 }, amount: 1 },
      { nutrient: { id: 1004 }, amount: 10 },
      { nutrient: { id: 1079 }, amount: 0 },
    ],
  };
}

describe("USDA nutrition import deduplication", () => {
  it("keeps one winner per canonical key", () => {
    const { winners, duplicatesSkipped } = dedupeUsdaCatalogCandidates(
      [
        row(1, "Egg, whole, raw, grade A"),
        row(2, "Egg, whole, raw, fresh"),
        row(3, "Egg, white, raw"),
      ],
      "Foundation Foods",
    );

    expect(winners).toHaveLength(2);
    expect(duplicatesSkipped).toBe(1);
    const whole = winners.find((w) => w.canonicalKey === "egg:whole:raw");
    expect(whole?.fdcId).toBe(2);
  });

  it("does not merge egg white and egg yolk", () => {
    const { winners } = dedupeUsdaCatalogCandidates(
      [row(10, "Egg, white, raw"), row(11, "Egg, yolk, raw")],
      "Foundation Foods",
    );
    expect(winners.map((w) => w.canonicalKey).sort()).toEqual([
      "egg:white:raw",
      "egg:yolk:raw",
    ]);
  });

  it("skips infant formula and similar low-value rows", () => {
    const parsed = parseUsdaFoodRow(
      row(99, "Infant formula, powder"),
      "SR Legacy",
    );
    expect(parsed).toBeNull();
  });

  it("reuses stable foodId per fdcId so existing foods are not duplicated", () => {
    const a = parseUsdaFoodRow(row(12345, "Banana, raw"), "SR Legacy");
    const b = parseUsdaFoodRow(row(12345, "Banana, raw"), "SR Legacy");
    expect(a?.foodId).toBe("usda:12345");
    expect(b?.foodId).toBe("usda:12345");
    expect(a?.canonicalKey).toBe("banana:raw");
  });
});
