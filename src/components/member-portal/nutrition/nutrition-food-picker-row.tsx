import type { NutritionFoodSearchResult } from "@/lib/nutrition/member-day";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

type NutritionFoodPickerRowProps = {
  food: NutritionFoodSearchResult;
  onSelect: (food: NutritionFoodSearchResult) => void;
  compact?: boolean;
  selected?: boolean;
};

export function NutritionFoodPickerRow({
  food,
  onSelect,
  compact = false,
  selected = false,
}: NutritionFoodPickerRowProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(food)}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-muted/80",
        compact && "py-3",
        selected && "bg-primary/10",
      )}
    >
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
          selected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-muted-foreground/40",
        )}
        aria-hidden
      >
        {selected ? <Check className="h-3 w-3" /> : null}
      </span>
      <p className="min-w-0 flex-1 text-base font-medium leading-snug">
        {food.name}
      </p>
      {!compact ? (
        <p className="mt-0.5 text-sm text-muted-foreground">
          {food.caloriesPer100g} kcal / 100g
        </p>
      ) : null}
    </button>
  );
}
