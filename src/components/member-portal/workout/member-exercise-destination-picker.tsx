"use client";

import * as React from "react";
import { Check, Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  personalWorkoutContainsCatalog,
  selectedPersonalWorkout,
} from "@/lib/member-portal/member-exercise-destination";
import type { MemberPersonalWorkoutSummary } from "@/lib/workout-tracking/member-personal-workouts";
import { cn } from "@/lib/utils";

type MemberExerciseDestinationPickerProps = {
  catalogId: string;
  workouts: MemberPersonalWorkoutSummary[];
  selectedWorkoutId: string;
  onSelectWorkoutId: (workoutId: string) => void;
  onCreateWorkout: () => void;
  onAdd: () => void;
  adding: boolean;
  creating: boolean;
};

function workoutMeta(
  workout: MemberPersonalWorkoutSummary,
  catalogId: string,
): string {
  const count =
    workout.exerciseCount === 0
      ? "No exercises"
      : `${workout.exerciseCount} ex.`;
  if (personalWorkoutContainsCatalog(workout, catalogId)) {
    return `${count} · Already added`;
  }
  return count;
}

export function MemberExerciseDestinationPicker({
  catalogId,
  workouts,
  selectedWorkoutId,
  onSelectWorkoutId,
  onCreateWorkout,
  onAdd,
  adding,
  creating,
}: MemberExerciseDestinationPickerProps) {
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const selected = selectedPersonalWorkout(workouts, selectedWorkoutId);
  const alreadyAdded =
    selected != null && personalWorkoutContainsCatalog(selected, catalogId);

  function selectWorkout(workoutId: string) {
    onSelectWorkoutId(workoutId);
    setPickerOpen(false);
  }

  if (workouts.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-center text-xs leading-snug text-muted-foreground">
          Create a personal workout to add this exercise.
        </p>
        <Button
          type="button"
          className="h-11 w-full gap-2 text-sm font-semibold"
          disabled={creating}
          onClick={() => onCreateWorkout()}
        >
          {creating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Create workout
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Add to workout
      </p>

      {pickerOpen ? (
        <div
          className="max-h-[min(11rem,38vh)] space-y-1 overflow-y-auto overscroll-contain rounded-xl border border-border/80 bg-background/95 p-1"
          role="listbox"
          aria-label="Choose a workout"
        >
          {workouts.map((workout) => {
            const isSelected = workout.id === selectedWorkoutId;
            return (
              <button
                key={workout.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg border px-2 py-2 text-left transition-colors",
                  isSelected
                    ? "border-primary bg-primary/10 ring-1 ring-primary/40 member-workout-glow"
                    : "border-transparent hover:border-primary/30 hover:bg-muted/40",
                )}
                onClick={() => selectWorkout(workout.id)}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded border-2",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/80 bg-card text-transparent",
                  )}
                  aria-hidden
                >
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {workout.name}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {workoutMeta(workout, catalogId)}
                  </span>
                </span>
              </button>
            );
          })}
          <button
            type="button"
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border/80 px-2 py-2 text-xs font-semibold text-primary hover:bg-primary/5"
            disabled={creating}
            onClick={() => {
              onCreateWorkout();
              setPickerOpen(false);
            }}
          >
            {creating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Create new workout
          </button>
        </div>
      ) : null}

      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border px-2.5 py-2",
          "border-primary bg-primary/10 ring-1 ring-primary/40 member-workout-glow",
        )}
      >
        <span
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-primary bg-primary text-primary-foreground"
          aria-hidden
        >
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">
            {selected?.name ?? "Select workout"}
          </p>
          {selected ? (
            <p className="truncate text-[11px] text-muted-foreground">
              {workoutMeta(selected, catalogId)}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 shrink-0 px-2 text-xs font-semibold text-primary hover:bg-primary/15"
          onClick={() => setPickerOpen((open) => !open)}
          aria-expanded={pickerOpen}
        >
          {pickerOpen ? "Done" : "Change"}
        </Button>
      </div>

      <Button
        type="button"
        className="h-11 w-full text-sm font-semibold"
        disabled={adding || !selected || alreadyAdded}
        onClick={() => onAdd()}
      >
        {adding
          ? "Adding…"
          : alreadyAdded
            ? "Already added"
            : `Add to ${selected?.name ?? "workout"}`}
      </Button>
    </div>
  );
}
