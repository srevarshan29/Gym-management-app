"use client";

import * as React from "react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import {
  addMemberWaterAction,
  celebrateMemberWaterGoalAction,
} from "@/app/actions/member-dashboard";
import { DashboardPercentRing } from "@/components/member-portal/dashboard/dashboard-percent-ring";
import { useAnimatedNumber } from "@/components/member-portal/dashboard/use-animated-number";
import { usePrefersReducedMotion } from "@/components/member-portal/dashboard/use-prefers-reduced-motion";
import { WaterGoalReachedToast } from "@/components/member-portal/dashboard/water-goal-reached-toast";
import { LockedLink } from "@/components/navigation/locked-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  dropFailedWaterWrite,
  enqueueWaterQuickAdd,
  reconcileWaterAfterServerSuccess,
  waterProgressWithPending,
  type WaterQuickAddOperation,
} from "@/lib/water/water-quick-add-sync";
import {
  formatWaterLiters,
  MEMBER_WATER_QUICK_ADD_ML,
} from "@/lib/water/water-progress";
import { cn } from "@/lib/utils";

const CARD_CLASS =
  "rounded-2xl border-0 bg-card/90 shadow-soft ring-1 ring-border/70 backdrop-blur-sm";

const FLOAT_INDICATOR_MS = 880;
const WATER_WRITE_MAX_ATTEMPTS = 3;

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
  onWaterProgress?: (progress: {
    consumedMl: number;
    percent: number;
    goalComplete: boolean;
  }) => void;
};

export function MemberDashboardMetricCards({
  logDate,
  calories,
  calorieTarget: _calorieTarget,
  caloriePercent,
  calorieGoalComplete,
  waterConsumedMl: initialWaterMl,
  waterTargetMl,
  waterPercent: initialWaterPercent,
  waterGoalComplete: initialWaterComplete,
  onWaterProgress,
}: MetricCardsProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [waterMl, setWaterMl] = useState(initialWaterMl);
  const [waterPercent, setWaterPercent] = useState(initialWaterPercent);
  const [waterComplete, setWaterComplete] = useState(initialWaterComplete);
  const [floatAmountMl, setFloatAmountMl] = useState<number | null>(null);
  const [waterRingCelebrate, setWaterRingCelebrate] = useState(false);
  const [goalToastOpen, setGoalToastOpen] = useState(false);

  const animatedWaterMl = useAnimatedNumber(waterMl);
  const floatBusyRef = useRef(false);
  const goalToastShownRef = useRef(initialWaterComplete);
  const waterCompleteRef = useRef(waterComplete);
  waterCompleteRef.current = waterComplete;

  const confirmedMlRef = useRef(initialWaterMl);
  const pendingOpsRef = useRef<WaterQuickAddOperation[]>([]);
  const processingRef = useRef(false);

  const logDateRef = useRef(logDate);

  const applyWaterProgress = useCallback(
    (progress: ReturnType<typeof waterProgressWithPending>) => {
      setWaterMl(progress.consumedMl);
      setWaterPercent(Math.round(progress.percent));
      setWaterComplete(progress.goalComplete);
      onWaterProgress?.({
        consumedMl: progress.consumedMl,
        percent: Math.round(progress.percent),
        goalComplete: progress.goalComplete,
      });
    },
    [onWaterProgress],
  );

  const syncDisplayFromQueue = useCallback(() => {
    applyWaterProgress(
      waterProgressWithPending(
        confirmedMlRef.current,
        pendingOpsRef.current,
        waterTargetMl,
      ),
    );
  }, [applyWaterProgress, waterTargetMl]);

  React.useEffect(() => {
    const dateChanged = logDateRef.current !== logDate;
    if (dateChanged) {
      logDateRef.current = logDate;
      confirmedMlRef.current = initialWaterMl;
      pendingOpsRef.current = [];
      goalToastShownRef.current = initialWaterComplete;
      setGoalToastOpen(false);
      applyWaterProgress(
        waterProgressWithPending(initialWaterMl, [], waterTargetMl),
      );
      return;
    }

    if (pendingOpsRef.current.length === 0 && !processingRef.current) {
      confirmedMlRef.current = initialWaterMl;
      applyWaterProgress(
        waterProgressWithPending(initialWaterMl, [], waterTargetMl),
      );
      if (!goalToastOpen) {
        goalToastShownRef.current = initialWaterComplete;
      }
    }
  }, [
    logDate,
    initialWaterMl,
    initialWaterPercent,
    initialWaterComplete,
    goalToastOpen,
    waterTargetMl,
    applyWaterProgress,
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

  const maybeCelebrateGoal = useCallback(
    (goalComplete: boolean) => {
      const wasCompleteBefore = waterCompleteRef.current;
      const newlyReached =
        goalComplete && !wasCompleteBefore && !goalToastShownRef.current;
      if (!newlyReached) return;

      goalToastShownRef.current = true;
      setWaterRingCelebrate(true);
      setGoalToastOpen(true);
      void celebrateMemberWaterGoalAction({ logDate });
      window.setTimeout(
        () => setWaterRingCelebrate(false),
        reducedMotion ? 0 : 650,
      );
    },
    [logDate, reducedMotion],
  );

  const processWaterQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;

    try {
      while (pendingOpsRef.current.length > 0) {
        const head = pendingOpsRef.current[0]!;
        let attempts = 0;
        let persisted = false;

        while (attempts < WATER_WRITE_MAX_ATTEMPTS && !persisted) {
          attempts += 1;
          const result = await addMemberWaterAction({
            logDate,
            amountMl: head.amountMl,
            operationId: head.operationId,
          });

          if (result.ok && result.data) {
            const reconciled = reconcileWaterAfterServerSuccess(
              result.data.consumedMl,
              pendingOpsRef.current,
            );
            confirmedMlRef.current = reconciled.confirmedConsumedMl;
            pendingOpsRef.current = reconciled.pending;
            syncDisplayFromQueue();
            maybeCelebrateGoal(result.data.goalComplete);
            persisted = true;
            continue;
          }

          if (attempts >= WATER_WRITE_MAX_ATTEMPTS) {
            pendingOpsRef.current = dropFailedWaterWrite(
              pendingOpsRef.current,
            );
            syncDisplayFromQueue();
            toast.error(
              result.ok
                ? "Could not log water."
                : result.error ?? "Could not log water.",
            );
          }
        }
      }
    } finally {
      processingRef.current = false;
      if (pendingOpsRef.current.length > 0) {
        void processWaterQueue();
      }
    }
  }, [logDate, maybeCelebrateGoal, syncDisplayFromQueue]);

  const onAddWater = useCallback(() => {
    pendingOpsRef.current = enqueueWaterQuickAdd(
      pendingOpsRef.current,
      MEMBER_WATER_QUICK_ADD_ML,
      crypto.randomUUID(),
    );
    syncDisplayFromQueue();
    showFloatIndicator(MEMBER_WATER_QUICK_ADD_ML);
    void processWaterQueue();
  }, [processWaterQueue, showFloatIndicator, syncDisplayFromQueue]);

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
