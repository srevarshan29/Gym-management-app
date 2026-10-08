"use client";

import { Star } from "lucide-react";

import {
  NutritionQuantityEditor,
  resolveFoodQuantityMode,
} from "@/components/member-portal/nutrition/nutrition-quantity-editor";
import { Button } from "@/components/ui/button";
import type { NutritionFoodSearchResult } from "@/lib/nutrition/member-day";
import {
  formatQuantityLabel,
  gramsFromQuantityInput,
  previewMacrosFromFood,
  servingLabelForFood,
} from "@/lib/nutrition/quantity-ui";
import { cn } from "@/lib/utils";

const MOBILE_FIELD_CLASS = "text-base";

type NutritionFoodDetailPanelProps = {
  food: NutritionFoodSearchResult;
  mealLabel: string;
  amount: number;
  onAmountChange: (amount: number) => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  adding: boolean;
  onAdd: () => void;
};

export function NutritionFoodDetailPanel({
  food,
  mealLabel,
  amount,
  onAmountChange,
  isFavorite,
  onToggleFavorite,
  adding,
  onAdd,
}: NutritionFoodDetailPanelProps) {
  const mode = resolveFoodQuantityMode(food);
  const servingLabel = servingLabelForFood(food);
  const grams = gramsFromQuantityInput(mode, amount, food.servingSizeGrams);
  const preview = previewMacrosFromFood(food, grams);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b px-4 pb-4 pt-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-bold leading-snug">
              {food.name}
            </h2>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-11 w-11 shrink-0"
            aria-pressed={isFavorite}
            aria-label={isFavorite ? "Remove favorite" : "Add favorite"}
            onClick={onToggleFavorite}
          >
            <Star
              className={cn(
                "h-5 w-5",
                isFavorite
                  ? "fill-amber-400 text-amber-500"
                  : "text-muted-foreground",
              )}
            />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4">
        <section>
          <p className="mb-2 text-sm font-medium text-muted-foreground">
            Quantity
          </p>
          <NutritionQuantityEditor
            food={food}
            mode={mode}
            amount={amount}
            onAmountChange={onAmountChange}
            compact
          />
        </section>

        <section className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">Measure</p>
          <p className={cn("text-base", MOBILE_FIELD_CLASS)}>
            {mode === "count"
              ? servingLabel ?? "Serving"
              : "Grams (g)"}
          </p>
          <p className="text-sm text-muted-foreground">
            {formatQuantityLabel(mode, amount, servingLabel, grams)}
          </p>
        </section>

        {preview ? (
          <>
            <section>
              <p className="text-sm font-medium text-muted-foreground">
                Calories
              </p>
              <p className="font-display text-3xl font-bold">
                {preview.calories}
                <span className="ml-1 text-base font-normal text-muted-foreground">
                  kcal
                </span>
              </p>
            </section>

            <section>
              <p className="mb-2 text-sm font-medium text-muted-foreground">
                Macronutrients
              </p>
              <div className="grid grid-cols-2 gap-2">
                <MacroCell label="Protein" value={`${preview.proteinGrams} g`} />
                <MacroCell label="Carbs" value={`${preview.carbsGrams} g`} />
                <MacroCell label="Fat" value={`${preview.fatGrams} g`} />
                <MacroCell label="Fiber" value={`${preview.fiberGrams} g`} />
              </div>
            </section>
          </>
        ) : null}
      </div>

      <div className="shrink-0 border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button
          className={cn("h-12 w-full text-base", MOBILE_FIELD_CLASS)}
          disabled={adding}
          onClick={onAdd}
        >
          {adding ? "Adding…" : `Add to ${mealLabel}`}
        </Button>
      </div>
    </div>
  );
}

function MacroCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/50 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
