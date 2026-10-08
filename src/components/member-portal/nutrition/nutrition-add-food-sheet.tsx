"use client";

import * as React from "react";
import { Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";

import {
  addMemberNutritionLog,
  getMemberNutritionAddFoodShortcuts,
  searchMemberNutritionFoods,
  setMemberNutritionFoodFavoriteAction,
} from "@/app/actions/member-nutrition";
import { NutritionFoodPickerRow } from "@/components/member-portal/nutrition/nutrition-food-picker-row";
import { NutritionMealSelector } from "@/components/member-portal/nutrition/nutrition-meal-selector";
import { NutritionSelectedFoodsPanel } from "@/components/member-portal/nutrition/nutrition-selected-foods-panel";
import { initialAmountForFood } from "@/components/member-portal/nutrition/nutrition-quantity-editor";
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
import { NUTRITION_SEARCH_MIN_CHARS } from "@/lib/nutrition/food-search";
import { applyFavoriteToggleToShortcuts } from "@/lib/nutrition/member-food-shortcuts-ui";
import {
  type NutritionTrackCartItem,
  removeFoodFromTrackCart,
  toggleFoodInTrackCart,
  updateTrackCartAmount,
} from "@/lib/nutrition/nutrition-track-cart";
import { resolveFoodQuantityMode } from "@/components/member-portal/nutrition/nutrition-quantity-editor";
import { gramsFromQuantityInput } from "@/lib/nutrition/quantity-ui";
import { cn } from "@/lib/utils";

const SHEET_CLASS =
  "fixed inset-0 z-50 flex h-[100dvh] max-h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-background p-0 sm:inset-auto sm:left-[50%] sm:top-[50%] sm:h-[min(100dvh,720px)] sm:max-h-[min(100dvh,720px)] sm:w-full sm:max-w-[390px] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-2xl sm:border sm:shadow-xl";

const MOBILE_FIELD_CLASS = "text-base";
const SHORTCUT_VISIBLE_LIMIT = 4;

type NutritionAddFoodSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  logDate: string;
  mealType: NutritionMealType;
  onMealTypeChange: (meal: NutritionMealType) => void;
  onDayUpdated: (day: MemberNutritionDayView) => void;
};

function ShortcutSection({
  title,
  foods,
  selectedIds,
  onToggle,
}: {
  title: string;
  foods: NutritionFoodSearchResult[];
  selectedIds: Set<string>;
  onToggle: (food: NutritionFoodSearchResult) => void;
}) {
  const visible = foods.slice(0, SHORTCUT_VISIBLE_LIMIT);
  if (visible.length === 0) return null;
  return (
    <div className="mb-2">
      <h3 className="px-4 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <ul className="divide-y divide-border/50">
        {visible.map((food) => (
          <li key={food.foodId}>
            <NutritionFoodPickerRow
              food={food}
              onSelect={onToggle}
              compact
              selected={selectedIds.has(food.foodId)}
            />
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
  onMealTypeChange,
  onDayUpdated,
}: NutritionAddFoodSheetProps) {
  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [results, setResults] = React.useState<NutritionFoodSearchResult[]>([]);
  const [recent, setRecent] = React.useState<NutritionFoodSearchResult[]>([]);
  const [favorites, setFavorites] = React.useState<NutritionFoodSearchResult[]>(
    [],
  );
  const [cart, setCart] = React.useState<NutritionTrackCartItem[]>([]);
  const [favoriteIds, setFavoriteIds] = React.useState<Set<string>>(new Set());
  const [shortcutsLoading, setShortcutsLoading] = React.useState(false);
  const [searching, setSearching] = React.useState(false);
  const [tracking, setTracking] = React.useState(false);
  const trackingRef = React.useRef(false);

  const mealLabel = NUTRITION_MEAL_LABELS[mealType];
  const showSearchResults = debouncedQuery.length >= NUTRITION_SEARCH_MIN_CHARS;
  const selectedIds = React.useMemo(
    () => new Set(cart.map((item) => item.foodId)),
    [cart],
  );

  React.useEffect(() => {
    if (!open) return;
    const handle = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
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
        const favs = result.data?.favorites ?? [];
        const rec = result.data?.recent ?? [];
        setFavorites(favs);
        setRecent(rec);
        setFavoriteIds(new Set(favs.map((f) => f.foodId)));
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
    if (debouncedQuery.length < NUTRITION_SEARCH_MIN_CHARS) {
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
      setRecent([]);
      setFavorites([]);
      setCart([]);
      setFavoriteIds(new Set());
      setTracking(false);
    }
  }, [open]);

  function toggleFood(food: NutritionFoodSearchResult) {
    setCart((prev) =>
      toggleFoodInTrackCart(prev, food, initialAmountForFood(food)),
    );
  }

  function onCartAmountChange(foodId: string, amount: number) {
    setCart((prev) => updateTrackCartAmount(prev, foodId, amount));
  }

  function onCartRemove(foodId: string) {
    setCart((prev) => removeFoodFromTrackCart(prev, foodId));
  }

  async function onToggleFavorite(foodId: string) {
    const food =
      cart.find((i) => i.foodId === foodId)?.food ??
      favorites.find((f) => f.foodId === foodId) ??
      recent.find((f) => f.foodId === foodId);
    if (!food) return;

    const next = !favoriteIds.has(foodId);
    const previousFavorites = favorites;
    const previousRecent = recent;
    const previousFavoriteIds = favoriteIds;

    setFavoriteIds((prev) => {
      const copy = new Set(prev);
      if (next) copy.add(foodId);
      else copy.delete(foodId);
      return copy;
    });
    const shortcutUpdate = applyFavoriteToggleToShortcuts(
      { favorites, recent },
      food,
      next,
    );
    setFavorites(shortcutUpdate.favorites);
    setRecent(shortcutUpdate.recent);

    try {
      const result = await setMemberNutritionFoodFavoriteAction({
        foodId,
        isFavorite: next,
      });
      if (!result.ok) {
        setFavorites(previousFavorites);
        setRecent(previousRecent);
        setFavoriteIds(previousFavoriteIds);
        toast.error(result.error);
      }
    } catch {
      setFavorites(previousFavorites);
      setRecent(previousRecent);
      setFavoriteIds(previousFavoriteIds);
      toast.error("Could not update favorite.");
    }
  }

  async function onTrackAll() {
    if (tracking || trackingRef.current || cart.length === 0) return;

    for (const item of cart) {
      const grams = gramsFromQuantityInput(
        resolveFoodQuantityMode(item.food),
        item.amount,
        item.food.servingSizeGrams,
      );
      if (grams < 0.1) {
        toast.error(`Enter a valid quantity for ${item.food.name}.`);
        return;
      }
    }

    trackingRef.current = true;
    setTracking(true);
    try {
      let latestDay: MemberNutritionDayView | null = null;
      for (const item of cart) {
        const grams = gramsFromQuantityInput(
          resolveFoodQuantityMode(item.food),
          item.amount,
          item.food.servingSizeGrams,
        );
        const result = await addMemberNutritionLog({
          logDate,
          mealType,
          foodId: item.foodId,
          quantityGrams: grams,
        });
        if (!result.ok) {
          toast.error(result.error);
          if (latestDay) {
            onDayUpdated(latestDay);
          }
          return;
        }
        if (result.data) {
          latestDay = result.data;
        }
      }
      if (latestDay) {
        onDayUpdated(latestDay);
      }
      toast.success(
        cart.length === 1
          ? `Tracked for ${mealLabel}.`
          : `Tracked ${cart.length} foods for ${mealLabel}.`,
      );
      onOpenChange(false);
    } catch (error) {
      console.error("[nutrition] track failed:", error);
      toast.error("Could not track foods. Please try again.");
    } finally {
      trackingRef.current = false;
      setTracking(false);
    }
  }

  const showShortcuts = !showSearchResults && !shortcutsLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(SHEET_CLASS, "text-base")}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Track food</DialogTitle>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 border-b px-4 pb-3 pt-3 safe-area-top">
            <div className="mb-3 flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10"
                aria-label="Close"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-5 w-5" />
              </Button>
              <h2 className="font-display text-lg font-bold">Track Food</h2>
              <div className="h-10 w-10" aria-hidden />
            </div>

            <NutritionMealSelector
              value={mealType}
              onChange={onMealTypeChange}
              className="mb-3"
            />

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by Food Name/Dish"
                className={cn("h-12 pl-9", MOBILE_FIELD_CLASS)}
                autoComplete="off"
                autoFocus
              />
            </div>
            {query.trim().length > 0 &&
            query.trim().length < NUTRITION_SEARCH_MIN_CHARS ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Type at least 2 characters.
              </p>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pt-2 pb-4">
            <NutritionSelectedFoodsPanel
              items={cart}
              favoriteFoodIds={favoriteIds}
              onAmountChange={onCartAmountChange}
              onRemove={onCartRemove}
              onToggleFavorite={onToggleFavorite}
            />

            {showSearchResults ? (
              searching ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching…
                </div>
              ) : results.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No foods found.
                </p>
              ) : (
                <ul className="divide-y divide-border/70">
                  {results.map((food) => (
                    <li key={food.foodId}>
                      <NutritionFoodPickerRow
                        food={food}
                        onSelect={toggleFood}
                        compact
                        selected={selectedIds.has(food.foodId)}
                      />
                    </li>
                  ))}
                </ul>
              )
            ) : shortcutsLoading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : showShortcuts ? (
              <>
                <ShortcutSection
                  title="Favorites"
                  foods={favorites}
                  selectedIds={selectedIds}
                  onToggle={toggleFood}
                />
                <ShortcutSection
                  title="Recent"
                  foods={recent}
                  selectedIds={selectedIds}
                  onToggle={toggleFood}
                />
                {favorites.length === 0 && recent.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                    Search to find foods in the catalog.
                  </p>
                ) : null}
              </>
            ) : null}
          </div>

          <div
            className="shrink-0 border-t bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
          >
            <Button
              className={cn("h-12 w-full text-base", MOBILE_FIELD_CLASS)}
              disabled={tracking || cart.length === 0}
              onClick={() => void onTrackAll()}
            >
              {tracking
                ? "Tracking…"
                : `Track for ${mealLabel}${cart.length > 0 ? ` (${cart.length})` : ""}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
