import { describe, expect, it } from "vitest";

import {
  calculateMacrosFromFood,
} from "@/lib/nutrition/calculations";
import {
  gramsFromQuantityInput,
  previewMacrosFromFood,
} from "@/lib/nutrition/quantity-ui";

const eggFood = {
  foodId: "usda:1",
  name: "Egg, whole, raw, frozen, pasteurized",
  category: null,
  caloriesPer100g: 150,
  proteinPer100g: 12,
  carbsPer100g: 1,
  fatPer100g: 10,
  fiberPer100g: 0,
  servingSizeGrams: 28.4,
  servingSizeLabel: null,
};

describe("nutrition quantity preview", () => {
  it("keeps preview aligned after rapid +/- style adjustments", () => {
    let amount = 1;
    for (let i = 0; i < 5; i += 1) amount += 1;
    const grams = gramsFromQuantityInput("count", amount, eggFood.servingSizeGrams);
    const preview = previewMacrosFromFood(eggFood, grams);
    const expected = calculateMacrosFromFood(eggFood, grams);
    expect(preview).toEqual(expected);
    expect(grams).toBe(170.4);
  });
});
