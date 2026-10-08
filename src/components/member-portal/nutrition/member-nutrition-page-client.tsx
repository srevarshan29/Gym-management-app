"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { NutritionAddFoodSheet } from "@/components/member-portal/nutrition/nutrition-add-food-sheet";
import { NutritionAttribution } from "@/components/member-portal/nutrition/nutrition-attribution";
import { NutritionCalorieRing } from "@/components/member-portal/nutrition/nutrition-calorie-ring";
import { NutritionDateNav } from "@/components/member-portal/nutrition/nutrition-date-nav";
import { NutritionLogEntryRow } from "@/components/member-portal/nutrition/nutrition-log-entry-row";
import { Button } from "@/components/ui/button";
import type { NutritionMealType } from "@/lib/firestore/types";
import {
  NUTRITION_MEAL_LABELS,
  NUTRITION_MEAL_TYPES,
} from "@/lib/nutrition/meal-types";
import type { MemberNutritionDayView } from "@/lib/nutrition/member-day";

type MemberNutritionPageClientProps = {
  initialDay: MemberNutritionDayView;
};

function mealCalories(
  items: MemberNutritionDayView["meals"][NutritionMealType],
): number {
  return items.reduce((sum, item) => sum + item.calories, 0);
}

export function MemberNutritionPageClient({
  initialDay,
}: MemberNutritionPageClientProps) {
  const [day, setDay] = React.useState(initialDay);
  const [addOpen, setAddOpen] = React.useState(false);
  const [addMeal, setAddMeal] = React.useState<NutritionMealType>("breakfast");

  React.useEffect(() => {
    setDay(initialDay);
  }, [initialDay]);

  function openAdd(mealType: NutritionMealType) {
    setAddMeal(mealType);
    setAddOpen(true);
  }

  return (
    <div className="mx-auto w-full max-w-[390px] space-y-4 pb-8">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Nutrition
        </h1>
      </header>

      <NutritionDateNav logDate={day.logDate} onDayLoaded={setDay} />

      <section className="rounded-2xl border border-border/60 bg-card px-4 py-4 shadow-sm">
        <div className="flex items-center gap-4">
          <NutritionCalorieRing
            calories={day.totals.calories}
            targetCalories={day.targetCalories}
            size={112}
            strokeWidth={9}
          />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm text-muted-foreground">Daily summary</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <MacroStat label="Protein" value={day.totals.proteinGrams} />
              <MacroStat label="Carbs" value={day.totals.carbsGrams} />
              <MacroStat label="Fat" value={day.totals.fatGrams} />
            </div>
          </div>
        </div>
      </section>

      <Button
        className="h-12 w-full gap-2 text-base shadow-sm"
        onClick={() => openAdd("breakfast")}
      >
        <Plus className="h-5 w-5" />
        Track Food
      </Button>

      <div className="space-y-5">
        {NUTRITION_MEAL_TYPES.map((mealType) => {
          const items = day.meals[mealType];
          const calories = mealCalories(items);
          return (
            <section key={mealType} className="space-y-2">
              <div className="flex items-end justify-between gap-2 border-b border-border/70 pb-2">
                <div>
                  <h2 className="text-base font-semibold">
                    {NUTRITION_MEAL_LABELS[mealType]}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {calories} kcal
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 gap-1 px-2 text-base text-primary"
                  onClick={() => openAdd(mealType)}
                >
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </div>
              {items.length === 0 ? (
                <p className="py-2 text-sm text-muted-foreground">
                  No foods logged.
                </p>
              ) : (
                <ul className="divide-y divide-border/60 rounded-xl border border-border/50 bg-card/50">
                  {items.map((entry) => (
                    <li key={entry.id} className="px-1">
                      <NutritionLogEntryRow
                        entry={entry}
                        logDate={day.logDate}
                        day={day}
                        onDayUpdated={setDay}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <NutritionAttribution />

      <NutritionAddFoodSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        logDate={day.logDate}
        mealType={addMeal}
        onMealTypeChange={setAddMeal}
        onDayUpdated={setDay}
      />
    </div>
  );
}

function MacroStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted/40 px-1 py-1.5">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}g</p>
    </div>
  );
}
