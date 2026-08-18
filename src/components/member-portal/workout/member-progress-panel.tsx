"use client";

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
import type {
  ExerciseProgressData,
  ExerciseProgressPoint,
  ProgressGrouping,
} from "@/lib/workout-tracking/progress";

const CARD_CLASS =
  "rounded-2xl border-0 bg-card/90 shadow-soft ring-1 ring-border/70";

function pointValue(
  point: ExerciseProgressPoint,
  trackingType: ExerciseProgressData["trackingType"],
): number | null {
  if (trackingType === "TIME") return point.maxDurationSeconds;
  return point.maxWeightKg;
}

function formatValue(
  value: number,
  trackingType: ExerciseProgressData["trackingType"],
): string {
  if (trackingType === "TIME") return `${value}s`;
  const rounded = Number.isInteger(value) ? String(value) : String(value);
  return `${rounded}kg`;
}

function deriveSummary(
  points: ExerciseProgressPoint[],
  trackingType: ExerciseProgressData["trackingType"],
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
  progress: ExerciseProgressData | null;
};

export function MemberProgressPanel({
  exercises,
  initialExerciseKey,
  initialGrouping = "weekly",
  progress,
}: MemberProgressPanelProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { navigate, isLocked } = useSharedNavigationLock();

  const exerciseFromUrl = searchParams.get("exercise");
  const groupingFromUrl = searchParams.get("grouping");

  const exerciseKey =
    exerciseFromUrl && exercises.some((item) => item.key === exerciseFromUrl)
      ? exerciseFromUrl
      : initialExerciseKey ?? exercises[0]?.key ?? "";

  const grouping: ProgressGrouping =
    groupingFromUrl === "monthly" || groupingFromUrl === "weekly"
      ? groupingFromUrl
      : initialGrouping;

  function updateParams(patch: Record<string, string>) {
    if (isLocked) return;
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      params.set(key, value);
    }
    const query = params.toString();
    const href = query ? `${pathname}?${query}` : pathname;
    navigate(href, undefined, { replace: true, refresh: true });
  }

  const summary =
    progress && progress.points.length > 0
      ? deriveSummary(progress.points, progress.trackingType, grouping)
      : null;

  const chartPoints =
    progress && grouping === "weekly"
      ? progress.points.map((point, index) => ({
          ...point,
          label: `W${index + 1}`,
        }))
      : (progress?.points ?? []);

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
            disabled={isLocked}
            onValueChange={(value) => updateParams({ exercise: value })}
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
              {summary ? (
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Current max</p>
                    <p className="font-display text-3xl font-bold">
                      {formatValue(summary.currentMax, progress?.trackingType ?? "WEIGHTED")}
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
                      {formatValue(summary.gain, progress?.trackingType ?? "WEIGHTED")}
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
              disabled={isLocked}
              variant={grouping === "weekly" ? "default" : "secondary"}
              onClick={() => updateParams({ grouping: "weekly" })}
            >
              Weekly
            </Button>
            <Button
              type="button"
              disabled={isLocked}
              variant={grouping === "monthly" ? "default" : "secondary"}
              onClick={() => updateParams({ grouping: "monthly" })}
            >
              Monthly
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
