import type { NutritionFoodSearchResult } from "@/lib/nutrition/member-day";

type NutritionFoodPickerRowProps = {
  food: NutritionFoodSearchResult;
  onSelect: (food: NutritionFoodSearchResult) => void;
};

export function NutritionFoodPickerRow({
  food,
  onSelect,
}: NutritionFoodPickerRowProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(food)}
      className="w-full rounded-xl px-3 py-3 text-left active:bg-muted"
    >
      <p className="font-medium leading-snug">{food.name}</p>
      <p className="mt-0.5 text-sm text-muted-foreground">
        {food.caloriesPer100g} kcal / 100g
        {food.servingSizeLabel ? ` · ${food.servingSizeLabel}` : ""}
      </p>
    </button>
  );
}
