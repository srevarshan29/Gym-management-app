"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { removeMemberNutritionLog } from "@/app/actions/member-nutrition";
import { NutritionAddFoodDialog } from "@/components/member-portal/nutrition/nutrition-add-food-dialog";
import { NutritionAttribution } from "@/components/member-portal/nutrition/nutrition-attribution";
import { NutritionCalorieRing } from "@/components/member-portal/nutrition/nutrition-calorie-ring";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { NutritionMealType } from "@/lib/firestore/types";
import {
  NUTRITION_MEAL_LABELS,
  NUTRITION_MEAL_TYPES,
} from "@/lib/nutrition/meal-types";
import type { MemberNutritionDayView } from "@/lib/nutrition/member-day";
import { cn } from "@/lib/utils";

const CARD_CLASS =
  "rounded-2xl border-0 bg-card/90 shadow-soft ring-1 ring-border/70";

type MemberNutritionPageClientProps = {
  initialDay: MemberNutritionDayView;
};

function MacroPill({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit: string;
}) {
  return (
    <div className="rounded-xl bg-muted/50 px-3 py-2 text-center">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="font-semibold">
        {value}
        <span className="text-xs font-normal text-muted-foreground">
          {unit}
        </span>
      </p>
    </div>
  );
}

export function MemberNutritionPageClient({
  initialDay,
}: MemberNutritionPageClientProps) {
  const [day, setDay] = React.useState(initialDay);
  const [addOpen, setAddOpen] = React.useState(false);
  const [addMeal, setAddMeal] = React.useState<NutritionMealType>("breakfast");
  const [removingId, setRemovingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setDay(initialDay);
  }, [initialDay]);

  function openAdd(mealType: NutritionMealType) {
    setAddMeal(mealType);
    setAddOpen(true);
  }

  async function onRemove(logId: string) {
    if (removingId) return;
    setRemovingId(logId);
    try {
      const result = await removeMemberNutritionLog({
        logDate: day.logDate,
        logId,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (result.data) {
        setDay(result.data);
      }
      toast.success("Removed.");
    } catch (error) {
      console.error("[nutrition] remove failed:", error);
      toast.error("Could not remove entry.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-bold">Nutrition</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Log meals and track daily calories and macros.
        </p>
      </div>

      <Card className={CARD_CLASS}>
        <CardContent className="flex flex-col items-center gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <NutritionCalorieRing
            calories={day.totals.calories}
            targetCalories={day.targetCalories}
          />
          <div className="grid w-full max-w-xs grid-cols-3 gap-2 sm:max-w-none sm:flex-1">
            <MacroPill label="Protein" value={day.totals.proteinGrams} unit="g" />
            <MacroPill label="Carbs" value={day.totals.carbsGrams} unit="g" />
            <MacroPill label="Fat" value={day.totals.fatGrams} unit="g" />
          </div>
        </CardContent>
      </Card>

      <Button className="w-full gap-2" onClick={() => openAdd("breakfast")}>
        <Plus className="h-4 w-4" />
        Add food
      </Button>

      {NUTRITION_MEAL_TYPES.map((mealType) => {
        const items = day.meals[mealType];
        return (
          <Card key={mealType} className={CARD_CLASS}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base">
                {NUTRITION_MEAL_LABELS[mealType]}
              </CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1 px-2"
                onClick={() => openAdd(mealType)}
              >
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {items.length === 0 ? (
                <p className="py-2 text-sm text-muted-foreground">
                  No foods logged yet.
                </p>
              ) : (
                items.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start justify-between gap-2 rounded-xl bg-muted/40 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{entry.foodName}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.quantityGrams}g · {entry.calories} kcal · P{" "}
                        {entry.proteinGrams}g · C {entry.carbsGrams}g · F{" "}
                        {entry.fatGrams}g
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive",
                      )}
                      disabled={removingId === entry.id}
                      aria-label={`Remove ${entry.foodName}`}
                      onClick={() => onRemove(entry.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        );
      })}

      <NutritionAttribution />

      <NutritionAddFoodDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        logDate={day.logDate}
        defaultMealType={addMeal}
        onDayUpdated={setDay}
      />
    </div>
  );
}
