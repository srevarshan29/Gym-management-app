"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { ExerciseProgressChart } from "@/components/workout/exercise-progress-chart";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ExerciseProgressData } from "@/lib/workout-tracking/progress";

type ExerciseProgressPanelProps = {
  exercises: { key: string; label: string }[];
  initialExerciseKey?: string;
  initialGrouping?: "weekly" | "monthly";
  progress: ExerciseProgressData | null;
};

export function ExerciseProgressPanel({
  exercises,
  initialExerciseKey,
  initialGrouping = "weekly",
  progress,
}: ExerciseProgressPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const exerciseFromUrl = searchParams.get("exercise");
  const groupingFromUrl = searchParams.get("grouping");

  const exerciseKey =
    exerciseFromUrl && exercises.some((item) => item.key === exerciseFromUrl)
      ? exerciseFromUrl
      : initialExerciseKey ?? exercises[0]?.key ?? "";

  const grouping =
    groupingFromUrl === "monthly" || groupingFromUrl === "weekly"
      ? groupingFromUrl
      : initialGrouping;

  function updateParams(patch: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      params.set(key, value);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
    router.refresh();
  }

  if (exercises.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        Assign a structured workout plan to track exercise progress.
      </p>
    );
  }

  return (
    <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Exercise</Label>
            <Select
              value={exerciseKey}
              onValueChange={(value) => updateParams({ exercise: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select exercise" />
              </SelectTrigger>
              <SelectContent>
                {exercises.map((item) => (
                  <SelectItem key={item.key} value={item.key}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Grouping</Label>
            <Select
              value={grouping}
              onValueChange={(value) => updateParams({ grouping: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {progress ? (
          <>
            <p className="text-sm text-muted-foreground">
              {progress.trackingType === "TIME"
                ? `Max duration per ${grouping === "weekly" ? "week" : "month"} for`
                : `Max weight per ${grouping === "weekly" ? "week" : "month"} for`}{" "}
              <span className="font-medium text-foreground">
                {progress.exerciseName}
              </span>
            </p>
            <ExerciseProgressChart
              key={`${exerciseKey}-${grouping}`}
              data={progress.points}
              targetWeightKg={progress.targetWeightKg}
              trackingType={progress.trackingType}
            />
          </>
        ) : null}
    </div>
  );
}
