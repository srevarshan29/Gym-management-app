"use client";

import * as React from "react";
import { ArrowLeft, Loader2, Search, Star } from "lucide-react";
import { toast } from "sonner";

import {
  addMemberNutritionLog,
  getMemberNutritionAddFoodShortcuts,
  getMemberNutritionFood,
  searchMemberNutritionFoods,
  setMemberNutritionFoodFavoriteAction,
} from "@/app/actions/member-nutrition";
import { NutritionFoodPickerRow } from "@/components/member-portal/nutrition/nutrition-food-picker-row";
import {
  initialAmountForFood,
  NutritionQuantityEditor,
  resolveFoodQuantityMode,
} from "@/components/member-portal/nutrition/nutrition-quantity-editor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { NutritionMealType } from "@/lib/firestore/types";
import { NUTRITION_MEAL_LABELS } from "@/lib/nutrition/meal-types";
import type {
  MemberNutritionDayView,
  NutritionFoodSearchResult,
} from "@/lib/nutrition/member-day";
import { gramsFromQuantityInput } from "@/lib/nutrition/quantity-ui";
import { cn } from "@/lib/utils";

const SHEET_CLASS =
  "fixed inset-0 z-50 flex h-[100dvh] max-h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 p-0 sm:inset-auto sm:left-[50%] sm:top-[50%] sm:h-auto sm:max-h-[min(90dvh,calc(100vh-2rem))] sm:max-w-md sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-xl sm:border sm:p-0";

const MOBILE_FIELD_CLASS = "text-base";

type NutritionAddFoodSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  logDate: string;
  mealType: NutritionMealType;
  onDayUpdated: (day: MemberNutritionDayView) => void;
};

function ShortcutSection({
  title,
  foods,
  onSelect,
}: {
  title: string;
  foods: NutritionFoodSearchResult[];
  onSelect: (food: NutritionFoodSearchResult) => void;
}) {
  if (foods.length === 0) return null;
  return (
    <div className="mb-4">
      <h3 className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <ul className="space-y-1">
        {foods.map((food) => (
          <li key={food.foodId}>
            <NutritionFoodPickerRow food={food} onSelect={onSelect} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function NutritionAddFoodSheet({
  open,
  onOpenChange,
  logDate,
  mealType,
  onDayUpdated,
}: NutritionAddFoodSheetProps) {
  const [step, setStep] = React.useState<"search" | "detail">("search");
  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [results, setResults] = React.useState<NutritionFoodSearchResult[]>([]);
  const [recent, setRecent] = React.useState<NutritionFoodSearchResult[]>([]);
  const [favorites, setFavorites] = React.useState<NutritionFoodSearchResult[]>(
    [],
  );
  const [shortcutsLoading, setShortcutsLoading] = React.useState(false);
  const [searching, setSearching] = React.useState(false);
  const [selected, setSelected] =
    React.useState<NutritionFoodSearchResult | null>(null);
  const [isFavorite, setIsFavorite] = React.useState(false);
  const [amount, setAmount] = React.useState(1);
  const [adding, setAdding] = React.useState(false);
  const [favoriting, setFavoriting] = React.useState(false);
  const addingRef = React.useRef(false);
  const favoritingRef = React.useRef(false);

  const mode = selected ? resolveFoodQuantityMode(selected) : "grams";
  const mealLabel = NUTRITION_MEAL_LABELS[mealType];
  const showSearchResults = debouncedQuery.length >= 3;

  React.useEffect(() => {
    if (!open) return;
    const handle = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(handle);
  }, [open, query]);

  React.useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setShortcutsLoading(true);
    void getMemberNutritionAddFoodShortcuts()
      .then((result) => {
        if (cancelled) return;
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        setRecent(result.data?.recent ?? []);
        setFavorites(result.data?.favorites ?? []);
      })
      .finally(() => {
        if (!cancelled) setShortcutsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

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
      setStep("search");
      setQuery("");
      setDebouncedQuery("");
      setResults([]);
      setRecent([]);
      setFavorites([]);
      setSelected(null);
      setIsFavorite(false);
      setAmount(1);
      setAdding(false);
      setFavoriting(false);
    }
  }, [open]);

  function selectFood(food: NutritionFoodSearchResult) {
    setSelected(food);
    setAmount(initialAmountForFood(food));
    setIsFavorite(false);
    setStep("detail");
    void getMemberNutritionFood({ foodId: food.foodId }).then((result) => {
      if (result.ok && result.data) {
        setIsFavorite(result.data.isFavorite);
      }
    });
  }

  async function onToggleFavorite() {
    if (!selected || favoriting || favoritingRef.current) return;
    const next = !isFavorite;
    favoritingRef.current = true;
    setFavoriting(true);
    try {
      const result = await setMemberNutritionFoodFavoriteAction({
        foodId: selected.foodId,
        isFavorite: next,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const saved = result.data?.isFavorite === true;
      setIsFavorite(saved);

      const shortcuts = await getMemberNutritionAddFoodShortcuts();
      if (shortcuts.ok && shortcuts.data) {
        setRecent(shortcuts.data.recent);
        setFavorites(shortcuts.data.favorites);
      }
    } catch (error) {
      console.error("[nutrition] favorite failed:", error);
      toast.error("Could not update favorite.");
    } finally {
      favoritingRef.current = false;
      setFavoriting(false);
    }
  }

  async function onAdd() {
    if (adding || addingRef.current || !selected) return;
    const grams = gramsFromQuantityInput(
      resolveFoodQuantityMode(selected),
      amount,
      selected.servingSizeGrams,
    );
    if (grams < 0.1) {
      toast.error("Enter a valid quantity.");
      return;
    }

    addingRef.current = true;
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
      toast.success(`Added to ${mealLabel}.`);
      onOpenChange(false);
    } catch (error) {
      console.error("[nutrition] add failed:", error);
      toast.error("Could not add food. Please try again.");
    } finally {
      addingRef.current = false;
      setAdding(false);
    }
  }

  const hasShortcuts = recent.length > 0 || favorites.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(SHEET_CLASS, "text-base")}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Add food to {mealLabel}</DialogTitle>

        {step === "search" ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 border-b px-4 pb-3 pt-4 safe-area-top">
              <p className="text-sm text-muted-foreground">Add to {mealLabel}</p>
              <h2 className="font-display text-lg font-bold">Search food</h2>
              <div className="relative mt-3">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search foods…"
                  className={cn("h-12 pl-9", MOBILE_FIELD_CLASS)}
                  autoComplete="off"
                  autoFocus
                />
              </div>
              {debouncedQuery.length > 0 && debouncedQuery.length < 3 ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Type at least 3 characters.
                </p>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2">
              {shortcutsLoading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading…
                </div>
              ) : (
                <>
                  <ShortcutSection
                    title="Recent Foods"
                    foods={recent}
                    onSelect={selectFood}
                  />
                  <ShortcutSection
                    title="Favorites"
                    foods={favorites}
                    onSelect={selectFood}
                  />
                </>
              )}

              {showSearchResults ? (
                searching ? (
                  <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching…
                  </div>
                ) : results.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No foods found.
                  </p>
                ) : (
                  <div>
                    <h3 className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Search results
                    </h3>
                    <ul className="space-y-1">
                      {results.map((food) => (
                        <li key={food.foodId}>
                          <NutritionFoodPickerRow
                            food={food}
                            onSelect={selectFood}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              ) : !shortcutsLoading && !hasShortcuts ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Search the catalog to log food.
                </p>
              ) : null}
            </div>
          </div>
        ) : selected ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 border-b px-4 pb-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn("-ml-2 mb-1 h-10 gap-1", MOBILE_FIELD_CLASS)}
                onClick={() => setStep("search")}
              >
                <ArrowLeft className="h-4 w-4" />
                Back to search
              </Button>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">{mealLabel}</p>
                  <h2 className="font-display text-lg font-bold leading-tight">
                    {selected.name}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selected.caloriesPer100g} kcal per 100g
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 shrink-0"
                  disabled={favoriting}
                  aria-pressed={isFavorite}
                  aria-label={isFavorite ? "Remove favorite" : "Add favorite"}
                  onClick={() => void onToggleFavorite()}
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

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
              <NutritionQuantityEditor
                food={selected}
                mode={mode}
                amount={amount}
                onAmountChange={setAmount}
              />
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
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
