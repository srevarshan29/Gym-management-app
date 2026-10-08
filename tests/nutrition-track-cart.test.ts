import { describe, expect, it } from "vitest";

import type { NutritionFoodSearchResult } from "@/lib/nutrition/member-day";
import {
  addFoodToTrackCart,
  isFoodInTrackCart,
  removeFoodFromTrackCart,
  toggleFoodInTrackCart,
  updateTrackCartAmount,
} from "@/lib/nutrition/nutrition-track-cart";

function food(id: string, name: string): NutritionFoodSearchResult {
  return {
    foodId: id,
    name,
    caloriesPer100g: 100,
    proteinPer100g: 10,
    carbsPer100g: 10,
    fatPer100g: 5,
    fiberPer100g: 1,
    servingSizeGrams: null,
    servingSizeLabel: null,
    category: null,
  };
}

describe("nutrition track cart", () => {
  it("adds foods without duplicates", () => {
    const a = food("a", "Apple");
    const b = food("b", "Banana");
    let cart = addFoodToTrackCart([], a, 1);
    cart = addFoodToTrackCart(cart, a, 2);
    cart = addFoodToTrackCart(cart, b, 100);
    expect(cart).toHaveLength(2);
    expect(isFoodInTrackCart(cart, "a")).toBe(true);
  });

  it("toggles selection and updates amounts", () => {
    const a = food("a", "Apple");
    let cart = toggleFoodInTrackCart([], a, 1);
    expect(cart).toHaveLength(1);
    cart = toggleFoodInTrackCart(cart, a, 1);
    expect(cart).toHaveLength(0);
    cart = toggleFoodInTrackCart([], a, 1);
    cart = updateTrackCartAmount(cart, "a", 2);
    expect(cart[0]?.amount).toBe(2);
    cart = removeFoodFromTrackCart(cart, "a");
    expect(cart).toHaveLength(0);
  });
});
