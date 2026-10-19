"use client";

import * as React from "react";
import { useCallback, useRef, useState, useTransition } from "react";

import { addMemberWaterAction } from "@/app/actions/member-dashboard";
import { DashboardPercentRing } from "@/components/member-portal/dashboard/dashboard-percent-ring";
import { useAnimatedNumber } from "@/components/member-portal/dashboard/use-animated-number";
import { usePrefersReducedMotion } from "@/components/member-portal/dashboard/use-prefers-reduced-motion";
import { WaterGoalReachedToast } from "@/components/member-portal/dashboard/water-goal-reached-toast";
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

const FLOAT_INDICATOR_MS = 880;

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
  calorieTarget: _calorieTarget,
  caloriePercent,
  calorieGoalComplete,
  waterConsumedMl: initialWaterMl,
  waterTargetMl: _waterTargetMl,
  waterPercent: initialWaterPercent,
  waterGoalComplete: initialWaterComplete,
}: MetricCardsProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [waterMl, setWaterMl] = useState(initialWaterMl);
  const [waterPercent, setWaterPercent] = useState(initialWaterPercent);
  const [waterComplete, setWaterComplete] = useState(initialWaterComplete);
  const [pending, startTransition] = useTransition();
  const [floatAmountMl, setFloatAmountMl] = useState<number | null>(null);
  const [waterRingCelebrate, setWaterRingCelebrate] = useState(false);
  const [goalToastOpen, setGoalToastOpen] = useState(false);

  const animatedWaterMl = useAnimatedNumber(waterMl);
  const floatBusyRef = useRef(false);
  const addQueueRef = useRef(false);
  const addInFlightRef = useRef(false);
  const goalToastShownRef = useRef(initialWaterComplete);
  const waterCompleteRef = useRef(waterComplete);
  waterCompleteRef.current = waterComplete;

  const logDateRef = useRef(logDate);

  React.useEffect(() => {
    const dateChanged = logDateRef.current !== logDate;
    if (dateChanged) {
      logDateRef.current = logDate;
      goalToastShownRef.current = initialWaterComplete;
      setGoalToastOpen(false);
    }
    setWaterMl(initialWaterMl);
    setWaterPercent(initialWaterPercent);
    setWaterComplete(initialWaterComplete);
    if (!dateChanged && !goalToastOpen) {
      goalToastShownRef.current = initialWaterComplete;
    }
  }, [
    logDate,
    initialWaterMl,
    initialWaterPercent,
    initialWaterComplete,
    goalToastOpen,
  ]);

  const dismissGoalToast = useCallback(() => {
    setGoalToastOpen(false);
  }, []);

  const showFloatIndicator = useCallback(
    (amountMl: number) => {
      if (reducedMotion) return;
      if (floatBusyRef.current) return;
      floatBusyRef.current = true;
      setFloatAmountMl(amountMl);
      window.setTimeout(() => {
        setFloatAmountMl(null);
        floatBusyRef.current = false;
      }, FLOAT_INDICATOR_MS);
    },
    [reducedMotion],
  );

  const runWaterAdd = useCallback(async () => {
    if (addInFlightRef.current) {
      addQueueRef.current = true;
      return;
    }
    addInFlightRef.current = true;
    const wasCompleteBefore = waterCompleteRef.current;

    try {
      const result = await addMemberWaterAction({
        logDate,
        amountMl: MEMBER_WATER_QUICK_ADD_ML,
      });
      if (!result.ok || !result.data) return;

      showFloatIndicator(MEMBER_WATER_QUICK_ADD_ML);
      setWaterMl(result.data.consumedMl);
      setWaterPercent(result.data.percent);
      setWaterComplete(result.data.goalComplete);

      const newlyReached =
        result.data.goalComplete &&
        !wasCompleteBefore &&
        !goalToastShownRef.current;
      if (newlyReached) {
        goalToastShownRef.current = true;
        setWaterRingCelebrate(true);
        setGoalToastOpen(true);
        window.setTimeout(
          () => setWaterRingCelebrate(false),
          reducedMotion ? 0 : 650,
        );
      }
    } finally {
      addInFlightRef.current = false;
      if (addQueueRef.current) {
        addQueueRef.current = false;
        void runWaterAdd();
      }
    }
  }, [logDate, showFloatIndicator, reducedMotion]);

  const onAddWater = useCallback(() => {
    startTransition(() => {
      void runWaterAdd();
    });
  }, [runWaterAdd]);

  const calorieRingPercent =
    caloriePercent ?? (calorieGoalComplete ? 100 : 0);

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Card className={cn(CARD_CLASS, "min-w-0")}>
          <CardContent className="flex flex-col gap-2 p-3">
            <div className="flex items-center gap-2">
              <DashboardPercentRing
                percent={calorieRingPercent}
                complete={calorieGoalComplete}
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
              <div className="relative shrink-0">
                <DashboardPercentRing
                  percent={waterPercent}
                  complete={waterComplete}
                  celebrate={waterRingCelebrate}
                />
              </div>
              <div className="relative min-w-0 flex-1 pr-1">
                {floatAmountMl != null ? (
                  <span
                    className={cn(
                      "pointer-events-none absolute -top-1 right-0 z-10 whitespace-nowrap text-[11px] font-semibold tabular-nums text-primary",
                      !reducedMotion && "animate-dashboard-water-float",
                    )}
                  >
                    +{floatAmountMl} ml
                  </span>
                ) : null}
                <p className="text-[11px] text-muted-foreground">Water</p>
                <p className="text-lg font-bold leading-tight tabular-nums">
                  {formatWaterLiters(animatedWaterMl)}
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

      <WaterGoalReachedToast open={goalToastOpen} onDismiss={dismissGoalToast} />
    </>
  );
}
