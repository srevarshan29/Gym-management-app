"use client";

import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { NutritionFoodSearchResult } from "@/lib/nutrition/member-day";
import { effectiveServingSizeGrams } from "@/lib/nutrition/nutrition-quantity-mode";
import {
  defaultQuantityAmount,
  formatQuantityLabel,
  gramsFromQuantityInput,
  previewMacrosFromFood,
  resolveQuantityMode,
  servingLabelForFood,
  type NutritionQuantityMode,
} from "@/lib/nutrition/quantity-ui";
import { cn } from "@/lib/utils";

const MOBILE_FIELD_CLASS = "text-base";

type NutritionQuantityEditorProps = {
  food: NutritionFoodSearchResult;
  mode: NutritionQuantityMode;
  amount: number;
  onAmountChange: (amount: number) => void;
  compact?: boolean;
  className?: string;
};

function stepForMode(mode: NutritionQuantityMode): number {
  return mode === "count" ? 1 : 10;
}

function quickAmounts(mode: NutritionQuantityMode): number[] {
  return mode === "count" ? [1, 2, 3] : [50, 100, 150, 200];
}

export function resolveFoodQuantityMode(
  food: NutritionFoodSearchResult,
): NutritionQuantityMode {
  return resolveQuantityMode(food);
}

export function initialAmountForFood(food: NutritionFoodSearchResult): number {
  const mode = resolveQuantityMode(food);
  return defaultQuantityAmount(mode, food);
}

export function NutritionQuantityEditor({
  food,
  mode,
  amount,
  onAmountChange,
  compact = false,
  className,
}: NutritionQuantityEditorProps) {
  const servingLabel = servingLabelForFood(food);
  const servingGrams = effectiveServingSizeGrams(food);
  const grams = gramsFromQuantityInput(mode, amount, servingGrams);
  const preview = previewMacrosFromFood(food, grams);
  const step = stepForMode(mode);
  const min = mode === "count" ? 0.5 : 1;

  function adjust(delta: number) {
    const next = Math.max(min, Math.round((amount + delta) * 10) / 10);
    onAmountChange(next);
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-11 w-11 shrink-0 rounded-full"
          aria-label="Decrease quantity"
          onClick={() => adjust(-step)}
          disabled={amount <= min}
        >
          <Minus className="h-5 w-5" />
        </Button>
        <div className="min-w-[7rem] text-center">
          <Input
            type="number"
            inputMode="decimal"
            min={min}
            step={mode === "count" ? 0.5 : 1}
            value={Number.isFinite(amount) ? amount : ""}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (!Number.isFinite(next)) return;
              onAmountChange(next);
            }}
            className={cn(
              "h-12 text-center font-semibold",
              MOBILE_FIELD_CLASS,
            )}
            aria-label={mode === "count" ? "Serving count" : "Grams"}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {mode === "count"
              ? `× ${servingLabel ?? "serving"}`
              : "grams"}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-11 w-11 shrink-0 rounded-full"
          aria-label="Increase quantity"
          onClick={() => adjust(step)}
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {quickAmounts(mode).map((value) => (
          <Button
            key={value}
            type="button"
            variant="secondary"
            size="sm"
            className={cn("h-9 min-w-[3rem]", MOBILE_FIELD_CLASS)}
            onClick={() => onAmountChange(value)}
          >
            {mode === "count" ? value : `${value}g`}
          </Button>
        ))}
      </div>

      {!compact && preview ? (
        <div className="rounded-xl bg-muted/50 p-3 text-center">
          <p className="text-sm font-medium">
            {formatQuantityLabel(mode, amount, servingLabel, grams)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {preview.calories} kcal · P {preview.proteinGrams}g · C{" "}
            {preview.carbsGrams}g · F {preview.fatGrams}g · Fiber{" "}
            {preview.fiberGrams}g
          </p>
        </div>
      ) : null}
    </div>
  );
}
