"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, Dumbbell, TrendingUp } from "lucide-react";

import { ExerciseProgressChart } from "@/components/workout/exercise-progress-chart";
import { LockedLink } from "@/components/navigation/locked-link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSharedNavigationLock } from "@/components/navigation/navigation-lock-provider";
import { cn } from "@/lib/utils";
import {
  formatProgressValue,
  progressMetricLabel,
  progressPointValue,
} from "@/lib/workout-tracking/progress-format";
import type { MemberExerciseProgressData } from "@/lib/workout-tracking/progress";
import type {
  ExerciseProgressPoint,
  ProgressGrouping,
} from "@/lib/workout-tracking/types";

const CARD_CLASS =
  "rounded-2xl border-0 bg-card/90 shadow-soft ring-1 ring-border/70";

function pointValue(
  point: ExerciseProgressPoint,
  trackingType: MemberExerciseProgressData["trackingType"],
): number | null {
  return progressPointValue(point, trackingType);
}

function formatValue(
  value: number,
  trackingType: MemberExerciseProgressData["trackingType"],
): string {
  return formatProgressValue(value, trackingType);
}

function deriveSummary(
  points: ExerciseProgressPoint[],
  trackingType: MemberExerciseProgressData["trackingType"],
  grouping: ProgressGrouping,
): {
  currentMax: number;
  gain: number | null;
  spanLabel: string | null;
} | null {
  const valued = points
    .map((point) => ({ point, value: pointValue(point, trackingType) }))
    .filter((row): row is { point: ExerciseProgressPoint; value: number } => {
      return row.value != null;
    });
  if (valued.length === 0) return null;

  const first = valued[0];
  const last = valued[valued.length - 1];
  const gain = valued.length > 1 ? last.value - first.value : null;
  const spanCount = points.length;
  const spanLabel =
    spanCount < 1
      ? null
      : grouping === "monthly"
        ? `${spanCount} mo`
        : `${spanCount} wk${spanCount === 1 ? "" : "s"}`;

  return {
    currentMax: last.value,
    gain,
    spanLabel,
  };
}

type MemberProgressPanelProps = {
  exercises: { key: string; label: string }[];
  initialExerciseKey?: string;
  initialGrouping?: ProgressGrouping;
  progress: MemberExerciseProgressData | null;
};

export function MemberProgressPanel({
  exercises,
  initialExerciseKey,
  initialGrouping = "weekly",
  progress,
}: MemberProgressPanelProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { navigate, pendingHref } = useSharedNavigationLock();

  const exerciseFromUrl = searchParams.get("exercise");
  const groupingFromUrl = searchParams.get("grouping");

  const exerciseKey =
    exerciseFromUrl && exercises.some((item) => item.key === exerciseFromUrl)
      ? exerciseFromUrl
      : initialExerciseKey ?? exercises[0]?.key ?? "";

  const groupingFromUrlOrInitial: ProgressGrouping =
    groupingFromUrl === "monthly" || groupingFromUrl === "weekly"
      ? groupingFromUrl
      : initialGrouping;

  const [grouping, setGrouping] = React.useState<ProgressGrouping>(
    groupingFromUrlOrInitial,
  );

  React.useEffect(() => {
    setGrouping(groupingFromUrlOrInitial);
  }, [groupingFromUrlOrInitial]);

  const exerciseNavPending =
    pendingHref != null && pendingHref.startsWith(pathname);

  function navigateExercise(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("exercise", value);
    if (grouping !== "weekly") {
      params.set("grouping", grouping);
    }
    const query = params.toString();
    const href = query ? `${pathname}?${query}` : pathname;
    navigate(href, undefined, { replace: true });
  }

  function setGroupingAndUrl(next: ProgressGrouping) {
    setGrouping(next);
    const params = new URLSearchParams(searchParams.toString());
    if (exerciseKey) {
      params.set("exercise", exerciseKey);
    }
    if (next === "weekly") {
      params.delete("grouping");
    } else {
      params.set("grouping", next);
    }
    const query = params.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    window.history.replaceState(window.history.state, "", url);
  }

  const chartPoints =
    progress?.pointsByGrouping[grouping] ?? progress?.points ?? [];

  const summary =
    progress && chartPoints.length > 0
      ? deriveSummary(chartPoints, progress.trackingType, grouping)
      : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <LockedLink
          href="/member/workout"
          aria-label="Back to workout"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-foreground hover:bg-muted"
        >
          <ChevronLeft className="h-5 w-5" />
        </LockedLink>
        <h1 className="font-display text-xl font-bold">Workout Progress</h1>
      </div>

      {exercises.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Assign a structured workout plan to track exercise progress.
        </p>
      ) : (
        <>
          <Select
            value={exerciseKey}
            disabled={exerciseNavPending}
            onValueChange={navigateExercise}
          >
            <SelectTrigger className="h-11 w-full rounded-full border-0 bg-card/90 px-4 shadow-soft ring-1 ring-border/70">
              <span className="flex min-w-0 items-center gap-2">
                <Dumbbell className="h-4 w-4 shrink-0 text-primary" />
                <SelectValue placeholder="Select exercise" />
              </span>
            </SelectTrigger>
            <SelectContent>
              {exercises.map((item) => (
                <SelectItem key={item.key} value={item.key}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Card className={CARD_CLASS}>
            <CardContent className="space-y-4 p-4">
              {summary && progress ? (
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Current max</p>
                    <p className="font-display text-3xl font-bold">
                      {formatValue(summary.currentMax, progress.trackingType)}
                    </p>
                  </div>
                  {summary.gain != null ? (
                    <p
                      className={cn(
                        "flex items-center gap-1 text-sm font-medium",
                        summary.gain >= 0 ? "text-primary" : "text-muted-foreground",
                      )}
                    >
                      {summary.gain >= 0 ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : null}
                      {summary.gain >= 0 ? "+" : ""}
                      {formatValue(summary.gain, progress.trackingType)}
                      {summary.spanLabel ? ` (${summary.spanLabel})` : ""}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {progress ? (
                <ExerciseProgressChart
                  key={`${exerciseKey}-${grouping}`}
                  data={chartPoints}
                  targetWeightKg={progress.targetWeightKg}
                  trackingType={progress.trackingType}
                />
              ) : null}

              {progress?.trackingType === "WEIGHTED" &&
              progress.targetWeightKg != null ? (
                <p className="text-center text-xs text-muted-foreground">
                  Target: {progress.targetWeightKg}kg (dashed line)
                </p>
              ) : null}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={grouping === "weekly" ? "default" : "secondary"}
              onClick={() => setGroupingAndUrl("weekly")}
            >
              Weekly
            </Button>
            <Button
              type="button"
              variant={grouping === "monthly" ? "default" : "secondary"}
              onClick={() => setGroupingAndUrl("monthly")}
            >
              Monthly
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
