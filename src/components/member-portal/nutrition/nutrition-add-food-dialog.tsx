"use client";

import * as React from "react";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import {
  addMemberNutritionLog,
  searchMemberNutritionFoods,
} from "@/app/actions/member-nutrition";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { NutritionMealType } from "@/lib/firestore/types";
import {
  NUTRITION_MEAL_LABELS,
  NUTRITION_MEAL_TYPES,
} from "@/lib/nutrition/meal-types";
import type {
  MemberNutritionDayView,
  NutritionFoodSearchResult,
} from "@/lib/nutrition/member-day";
import { cn } from "@/lib/utils";

type NutritionAddFoodDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  logDate: string;
  defaultMealType: NutritionMealType;
  onDayUpdated: (day: MemberNutritionDayView) => void;
};

export function NutritionAddFoodDialog({
  open,
  onOpenChange,
  logDate,
  defaultMealType,
  onDayUpdated,
}: NutritionAddFoodDialogProps) {
  const [mealType, setMealType] =
    React.useState<NutritionMealType>(defaultMealType);
  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [results, setResults] = React.useState<NutritionFoodSearchResult[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [selected, setSelected] =
    React.useState<NutritionFoodSearchResult | null>(null);
  const [quantityGrams, setQuantityGrams] = React.useState("100");
  const [adding, setAdding] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setMealType(defaultMealType);
  }, [defaultMealType, open]);

  React.useEffect(() => {
    if (!open) return;
    const handle = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(handle);
  }, [open, query]);

  React.useEffect(() => {
    if (!open) return;
    if (debouncedQuery.length < 3) {
      setResults([]);
      setSearching(false);
      return;
    }

    let cancelled = false;
    setSearching(true);
    void searchMemberNutritionFoods({ query: debouncedQuery })
      .then((result) => {
        if (cancelled) return;
        if (!result.ok) {
          toast.error(result.error);
          setResults([]);
          return;
        }
        setResults(result.data ?? []);
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, open]);

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setDebouncedQuery("");
      setResults([]);
      setSelected(null);
      setQuantityGrams("100");
      setAdding(false);
    }
  }, [open]);

  async function onAdd() {
    if (adding || !selected) return;
    const grams = Number(quantityGrams);
    if (!grams || grams < 0.1) {
      toast.error("Enter a valid quantity in grams.");
      return;
    }

    setAdding(true);
    try {
      const result = await addMemberNutritionLog({
        logDate,
        mealType,
        foodId: selected.foodId,
        quantityGrams: grams,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (result.data) {
        onDayUpdated(result.data);
      }
      toast.success("Food added.");
      onOpenChange(false);
    } catch (error) {
      console.error("[nutrition] add failed:", error);
      toast.error("Could not add food. Please try again.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add food</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Meal</Label>
            <Select
              value={mealType}
              onValueChange={(value) =>
                setMealType(value as NutritionMealType)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NUTRITION_MEAL_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {NUTRITION_MEAL_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="food-search">Search food</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="food-search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelected(null);
                }}
                placeholder="e.g. rice, chicken, apple"
                className="pl-9"
                autoComplete="off"
              />
            </div>
            {debouncedQuery.length > 0 && debouncedQuery.length < 3 ? (
              <p className="text-xs text-muted-foreground">
                Type at least 3 characters to search.
              </p>
            ) : null}
          </div>

          <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border p-1">
            {searching ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching…
              </div>
            ) : results.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {debouncedQuery.length >= 3
                  ? "No foods found."
                  : "Search the food catalog."}
              </p>
            ) : (
              results.map((food) => (
                <button
                  key={food.foodId}
                  type="button"
                  onClick={() => {
                    setSelected(food);
                    if (food.servingSizeGrams != null) {
                      setQuantityGrams(String(food.servingSizeGrams));
                    }
                  }}
                  className={cn(
                    "w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                    selected?.foodId === food.foodId && "bg-primary/10 ring-1 ring-primary/30",
                  )}
                >
                  <p className="font-medium">{food.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {food.caloriesPer100g} kcal / 100g
                    {food.category ? ` · ${food.category}` : ""}
                  </p>
                </button>
              ))
            )}
          </div>

          {selected ? (
            <div className="space-y-2">
              <Label htmlFor="quantity-grams">Quantity (grams)</Label>
              <Input
                id="quantity-grams"
                type="number"
                min={0.1}
                step={1}
                inputMode="decimal"
                value={quantityGrams}
                onChange={(e) => setQuantityGrams(e.target.value)}
              />
              {selected.servingSizeLabel ? (
                <p className="text-xs text-muted-foreground">
                  Typical serving: {selected.servingSizeLabel}
                  {selected.servingSizeGrams != null
                    ? ` (${selected.servingSizeGrams}g)`
                    : ""}
                </p>
              ) : null}
            </div>
          ) : null}

          <Button
            className="w-full"
            disabled={!selected || adding}
            onClick={onAdd}
          >
            {adding ? "Adding…" : "Add to log"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
