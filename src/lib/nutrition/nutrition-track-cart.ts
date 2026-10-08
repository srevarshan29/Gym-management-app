import type { NutritionFoodSearchResult } from "@/lib/nutrition/member-day";

export type NutritionTrackCartItem = {
  foodId: string;
  food: NutritionFoodSearchResult;
  amount: number;
};

export function isFoodInTrackCart(
  cart: NutritionTrackCartItem[],
  foodId: string,
): boolean {
  return cart.some((item) => item.foodId === foodId);
}

export function addFoodToTrackCart(
  cart: NutritionTrackCartItem[],
  food: NutritionFoodSearchResult,
  amount: number,
): NutritionTrackCartItem[] {
  if (isFoodInTrackCart(cart, food.foodId)) {
    return cart;
  }
  return [...cart, { foodId: food.foodId, food, amount }];
}

export function removeFoodFromTrackCart(
  cart: NutritionTrackCartItem[],
  foodId: string,
): NutritionTrackCartItem[] {
  return cart.filter((item) => item.foodId !== foodId);
}

export function updateTrackCartAmount(
  cart: NutritionTrackCartItem[],
  foodId: string,
  amount: number,
): NutritionTrackCartItem[] {
  return cart.map((item) =>
    item.foodId === foodId ? { ...item, amount } : item,
  );
}

export function toggleFoodInTrackCart(
  cart: NutritionTrackCartItem[],
  food: NutritionFoodSearchResult,
  defaultAmount: number,
): NutritionTrackCartItem[] {
  if (isFoodInTrackCart(cart, food.foodId)) {
    return removeFoodFromTrackCart(cart, food.foodId);
  }
  return addFoodToTrackCart(cart, food, defaultAmount);
}
