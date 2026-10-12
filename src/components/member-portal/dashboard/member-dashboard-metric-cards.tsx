"use client";

import { useCallback, useState, useTransition } from "react";

import { addMemberWaterAction } from "@/app/actions/member-dashboard";
import { DashboardPercentRing } from "@/components/member-portal/dashboard/dashboard-percent-ring";
import { LockedLink } from "@/components/navigation/locked-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  formatWaterLiters,
  MEMBER_WATER_QUICK_ADD_ML,
} from "@/lib/water/water-progress";
import { cn } from "@/lib/utils";

const CARD_CLASS =
  "rounded-2xl border-0 bg-card/90 shadow-soft ring-1 ring-border/70 backdrop-blur-sm";

type MetricCardsProps = {
  logDate: string;
  calories: number;
  calorieTarget: number | null;
  caloriePercent: number | null;
  calorieGoalComplete: boolean;
  waterConsumedMl: number;
  waterTargetMl: number;
  waterPercent: number;
  waterGoalComplete: boolean;
};

export function MemberDashboardMetricCards({
  logDate,
  calories,
  calorieTarget,
  caloriePercent,
  calorieGoalComplete,
  waterConsumedMl: initialWaterMl,
  waterTargetMl,
  waterPercent: initialWaterPercent,
  waterGoalComplete: initialWaterComplete,
}: MetricCardsProps) {
  const [waterMl, setWaterMl] = useState(initialWaterMl);
  const [waterPercent, setWaterPercent] = useState(initialWaterPercent);
  const [waterComplete, setWaterComplete] = useState(initialWaterComplete);
  const [pending, startTransition] = useTransition();

  const onAddWater = useCallback(() => {
    startTransition(async () => {
      const result = await addMemberWaterAction({
        logDate,
        amountMl: MEMBER_WATER_QUICK_ADD_ML,
      });
      if (!result.ok || !result.data) return;
      setWaterMl(result.data.consumedMl);
      setWaterPercent(result.data.percent);
      setWaterComplete(result.data.goalComplete);
    });
  }, [logDate]);

  const calorieRingPercent =
    caloriePercent ?? (calorieGoalComplete ? 100 : 0);
  const calorieCompleteUi = calorieGoalComplete;
  const waterCompleteUi = waterComplete;

  return (
    <div className="grid grid-cols-2 gap-2">
      <Card className={cn(CARD_CLASS, "min-w-0")}>
        <CardContent className="flex flex-col gap-2 p-3">
          <div className="flex items-center gap-2">
            <DashboardPercentRing
              percent={calorieRingPercent}
              complete={calorieCompleteUi}
            />
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">Calories</p>
              <p className="text-lg font-bold leading-tight tabular-nums">
                {calories.toLocaleString()}
              </p>
            </div>
          </div>
          <LockedLink href="/member/nutrition" className="w-full">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 w-full rounded-xl text-xs text-primary"
            >
              Log meal
            </Button>
          </LockedLink>
        </CardContent>
      </Card>

      <Card className={cn(CARD_CLASS, "min-w-0")}>
        <CardContent className="flex flex-col gap-2 p-3">
          <div className="flex items-center gap-2">
            <DashboardPercentRing
              percent={waterPercent}
              complete={waterCompleteUi}
            />
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">Water</p>
              <p className="text-lg font-bold leading-tight tabular-nums">
                {formatWaterLiters(waterMl)}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-8 w-full rounded-xl text-xs text-primary"
            disabled={pending}
            onClick={onAddWater}
          >
            + {MEMBER_WATER_QUICK_ADD_ML} ml
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
