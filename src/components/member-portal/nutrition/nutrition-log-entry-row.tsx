"use client";

import * as React from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  getMemberNutritionFood,
  removeMemberNutritionLog,
  updateMemberNutritionLog,
} from "@/app/actions/member-nutrition";
import {
  NutritionQuantityEditor,
  resolveFoodQuantityMode,
} from "@/components/member-portal/nutrition/nutrition-quantity-editor";
import { Button } from "@/components/ui/button";
import { removeNutritionLogEntryOptimistic } from "@/lib/nutrition/member-day-optimistic";
import type {
  MemberNutritionDayView,
  NutritionFoodSearchResult,
  NutritionLogEntryView,
} from "@/lib/nutrition/member-day";
import {
  formatLogQuantity,
  formatQuantityLabel,
  gramsFromQuantityInput,
  quantityAmountFromGrams,
  resolveQuantityMode,
  servingLabelForFood,
} from "@/lib/nutrition/quantity-ui";
type NutritionLogEntryRowProps = {
  entry: NutritionLogEntryView;
  logDate: string;
  day: MemberNutritionDayView;
  disabled?: boolean;
  onDayUpdated: (day: MemberNutritionDayView) => void;
};

export function NutritionLogEntryRow({
  entry,
  logDate,
  day,
  disabled,
  onDayUpdated,
}: NutritionLogEntryRowProps) {
  const [editing, setEditing] = React.useState(false);
  const [food, setFood] = React.useState<NutritionFoodSearchResult | null>(null);
  const [loadingFood, setLoadingFood] = React.useState(false);
  const [amount, setAmount] = React.useState(entry.quantityGrams);
  const [saving, setSaving] = React.useState(false);
  const [removedOptimistic, setRemovedOptimistic] = React.useState(false);
  const savingRef = React.useRef(false);
  const removingRef = React.useRef(false);

  const busy = disabled || saving;

  React.useEffect(() => {
    if (!editing) return;
    let cancelled = false;
    setLoadingFood(true);
    void getMemberNutritionFood({ foodId: entry.foodId })
      .then((result) => {
        if (cancelled) return;
        if (!result.ok || !result.data) {
          toast.error(result.ok ? "Food not found." : result.error);
          setEditing(false);
          return;
        }
        setFood(result.data);
        const mode = resolveQuantityMode(result.data);
        setAmount(
          quantityAmountFromGrams(
            mode,
            entry.quantityGrams,
            result.data.servingSizeGrams,
          ),
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingFood(false);
      });
    return () => {
      cancelled = true;
    };
  }, [editing, entry.foodId, entry.quantityGrams]);

  async function onSaveQuantity() {
    if (saving || savingRef.current || !food) return;
    const mode = resolveFoodQuantityMode(food);
    const grams = gramsFromQuantityInput(mode, amount, food.servingSizeGrams);
    if (grams < 0.1) {
      toast.error("Enter a valid quantity.");
      return;
    }

    savingRef.current = true;
    setSaving(true);
    try {
      const result = await updateMemberNutritionLog({
        logDate,
        logId: entry.id,
        quantityGrams: grams,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (result.data) {
        onDayUpdated(result.data);
      }
      setEditing(false);
    } catch (error) {
      console.error("[nutrition] update failed:", error);
      toast.error("Could not update entry.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function onRemove() {
    if (removingRef.current) return;
    removingRef.current = true;

    const previousDay = day;
    const optimisticDay = removeNutritionLogEntryOptimistic(day, entry.id);
    setRemovedOptimistic(true);
    onDayUpdated(optimisticDay);

    try {
      const result = await removeMemberNutritionLog({
        logDate,
        logId: entry.id,
      });
      if (!result.ok) {
        setRemovedOptimistic(false);
        onDayUpdated(previousDay);
        toast.error(result.error);
        return;
      }
      if (result.data) {
        onDayUpdated(result.data);
      }
    } catch (error) {
      setRemovedOptimistic(false);
      onDayUpdated(previousDay);
      console.error("[nutrition] remove failed:", error);
      toast.error("Could not remove entry.");
    } finally {
      removingRef.current = false;
    }
  }

  const quantityLabel = formatLogQuantity(entry.quantityGrams);

  if (removedOptimistic) {
    return null;
  }

  return (
    <div className="rounded-xl bg-muted/40 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          disabled={busy}
          onClick={() => setEditing((value) => !value)}
        >
          <p className="truncate font-medium leading-snug">{entry.foodName}</p>
          <p className="text-sm text-muted-foreground">
            {quantityLabel} · {entry.calories} kcal
          </p>
        </button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
          disabled={busy}
          aria-label={`Remove ${entry.foodName}`}
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {editing ? (
        <div className="mt-3 space-y-3 border-t border-border/60 pt-3">
          {loadingFood || !food ? (
            <div className="flex justify-center py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : (
            <>
              <NutritionQuantityEditor
                food={food}
                mode={resolveFoodQuantityMode(food)}
                amount={amount}
                onAmountChange={setAmount}
                compact
              />
              <p className="text-center text-xs text-muted-foreground">
                {formatQuantityLabel(
                  resolveFoodQuantityMode(food),
                  amount,
                  servingLabelForFood(food),
                  gramsFromQuantityInput(
                    resolveFoodQuantityMode(food),
                    amount,
                    food.servingSizeGrams,
                  ),
                )}
              </p>
              <Button
                type="button"
                className="h-11 w-full text-base"
                disabled={saving}
                onClick={onSaveQuantity}
              >
                {saving ? "Saving…" : "Update"}
              </Button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
