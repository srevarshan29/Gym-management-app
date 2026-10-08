"use client";

import { Star, X } from "lucide-react";

import {
  NutritionQuantityEditor,
  resolveFoodQuantityMode,
} from "@/components/member-portal/nutrition/nutrition-quantity-editor";
import { Button } from "@/components/ui/button";
import type { NutritionTrackCartItem } from "@/lib/nutrition/nutrition-track-cart";
import {
  formatQuantityLabel,
  gramsFromQuantityInput,
  previewMacrosFromFood,
  servingLabelForFood,
} from "@/lib/nutrition/quantity-ui";
import { cn } from "@/lib/utils";

type NutritionSelectedFoodsPanelProps = {
  items: NutritionTrackCartItem[];
  favoriteFoodIds: Set<string>;
  onAmountChange: (foodId: string, amount: number) => void;
  onRemove: (foodId: string) => void;
  onToggleFavorite: (foodId: string) => void;
};

export function NutritionSelectedFoodsPanel({
  items,
  favoriteFoodIds,
  onAmountChange,
  onRemove,
  onToggleFavorite,
}: NutritionSelectedFoodsPanelProps) {
  if (items.length === 0) return null;

  return (
    <section className="mb-3 border-b border-border/70 pb-3">
      <h3 className="px-4 pb-2 text-sm font-semibold">
        Selected ({items.length})
      </h3>
      <ul className="space-y-2 px-2">
        {items.map((item) => {
          const mode = resolveFoodQuantityMode(item.food);
          const servingLabel = servingLabelForFood(item.food);
          const grams = gramsFromQuantityInput(
            mode,
            item.amount,
            item.food.servingSizeGrams,
          );
          const preview = previewMacrosFromFood(item.food, grams);
          const isFavorite = favoriteFoodIds.has(item.foodId);

          return (
            <li
              key={item.foodId}
              className="rounded-xl border border-primary/30 bg-primary/5 p-3"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <p className="min-w-0 flex-1 text-base font-medium leading-snug">
                  {item.food.name}
                </p>
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    aria-pressed={isFavorite}
                    aria-label={
                      isFavorite ? "Remove favorite" : "Add favorite"
                    }
                    onClick={() => onToggleFavorite(item.foodId)}
                  >
                    <Star
                      className={cn(
                        "h-4 w-4",
                        isFavorite
                          ? "fill-amber-400 text-amber-500"
                          : "text-muted-foreground",
                      )}
                    />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground"
                    aria-label={`Remove ${item.food.name}`}
                    onClick={() => onRemove(item.foodId)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <NutritionQuantityEditor
                food={item.food}
                mode={mode}
                amount={item.amount}
                onAmountChange={(amount) => onAmountChange(item.foodId, amount)}
                compact
              />
              {preview ? (
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  {formatQuantityLabel(mode, item.amount, servingLabel, grams)}{" "}
                  · {preview.calories} kcal
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
