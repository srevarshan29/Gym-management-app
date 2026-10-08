"use client";

import type { NutritionMealType } from "@/lib/firestore/types";
import {
  NUTRITION_MEAL_LABELS,
  NUTRITION_MEAL_TYPES,
} from "@/lib/nutrition/meal-types";
import { cn } from "@/lib/utils";

type NutritionMealSelectorProps = {
  value: NutritionMealType;
  onChange: (meal: NutritionMealType) => void;
  className?: string;
};

export function NutritionMealSelector({
  value,
  onChange,
  className,
}: NutritionMealSelectorProps) {
  return (
    <div
      className={cn(
        "flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {NUTRITION_MEAL_TYPES.map((meal) => {
        const active = meal === value;
        return (
          <button
            key={meal}
            type="button"
            onClick={() => onChange(meal)}
            className={cn(
              "shrink-0 rounded-full px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            {NUTRITION_MEAL_LABELS[meal]}
          </button>
        );
      })}
    </div>
  );
}
