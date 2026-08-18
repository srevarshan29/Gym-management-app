"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, ChevronLeft, ChevronRight, Plus } from "lucide-react";

import {
  completeWorkoutSession,
  logWorkoutSet,
} from "@/app/actions/workout-sessions";
import { RestTimer } from "@/components/member-portal/workout/rest-timer";
import { SessionTimer } from "@/components/member-portal/workout/session-timer";
import { LockedLink } from "@/components/navigation/locked-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useActionLock } from "@/hooks/use-action-lock";
import { cn } from "@/lib/utils";
import type { PreviousSetLog } from "@/lib/workout-tracking/previous-sets";
import type { ActiveWorkoutSession } from "@/lib/workout-tracking/sessions";

const MAX_SETS = 20;

function toIsoTimestamp(value: string | Date): string {
  return typeof value === "string" ? value : value.toISOString();
}

function formatWeight(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value);
}

function formatPrev(
  previous: PreviousSetLog | undefined,
  trackingType: ActiveWorkoutSession["exercises"][number]["trackingType"],
  targetReps: string,
): string {
  if (!previous) return "—";
  if (trackingType === "WEIGHTED") {
    if (previous.weightKg == null) return "—";
    return `${formatWeight(previous.weightKg)}kg × ${targetReps}`;
  }
  if (trackingType === "TIME") {
    if (previous.durationSeconds == null) return "—";
    return `${previous.durationSeconds}s`;
  }
  return targetReps ? `× ${targetReps}` : "Done";
}

function defaultInputValue(
  trackingType: ActiveWorkoutSession["exercises"][number]["trackingType"],
  logged: ActiveWorkoutSession["exercises"][number]["sets"][number] | undefined,
  previous: PreviousSetLog | undefined,
  targetWeightKg: number | null,
): string {
  if (trackingType === "TIME") {
    if (logged?.durationSeconds != null) return String(logged.durationSeconds);
    if (previous?.durationSeconds != null) return String(previous.durationSeconds);
    return "";
  }
  if (trackingType === "WEIGHTED") {
    if (logged?.weightKg != null) return formatWeight(logged.weightKg);
    if (previous?.weightKg != null) return formatWeight(previous.weightKg);
    if (targetWeightKg != null) return formatWeight(targetWeightKg);
    return "";
  }
  return "";
}

function firstIncompleteIndex(session: ActiveWorkoutSession): number {
  const index = session.exercises.findIndex((exercise) => {
    const logged = new Set(exercise.sets.map((set) => set.setNumber));
    return Array.from({ length: exercise.targetSets }, (_, i) => i + 1).some(
      (setNumber) => !logged.has(setNumber),
    );
  });
  return index >= 0 ? index : 0;
}

type WorkoutSessionViewProps = {
  session: ActiveWorkoutSession;
  previousSets: Record<string, PreviousSetLog[]>;
};

export function WorkoutSessionView({
  session,
  previousSets,
}: WorkoutSessionViewProps) {
  const router = useRouter();
  const { run, isPending: pending } = useActionLock();
  const [exerciseIndex, setExerciseIndex] = React.useState(() =>
    firstIncompleteIndex(session),
  );
  const [addedSets, setAddedSets] = React.useState<Record<string, number>>({});
  const [setValues, setSetValues] = React.useState<Record<string, string>>({});

  const exercises = session.exercises;
  const total = exercises.length;
  const safeIndex = Math.min(exerciseIndex, Math.max(0, total - 1));
  const exercise = exercises[safeIndex];

  React.useEffect(() => {
    if (exerciseIndex !== safeIndex) setExerciseIndex(safeIndex);
  }, [exerciseIndex, safeIndex]);

  if (!exercise || total === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        This session has no exercises.
      </p>
    );
  }

  const previousForExercise = previousSets[exercise.id] ?? [];
  const maxLogged = exercise.sets.reduce(
    (max, set) => Math.max(max, set.setNumber),
    0,
  );
  const extra = addedSets[exercise.id] ?? 0;
  const rowCount = Math.min(
    MAX_SETS,
    Math.max(exercise.targetSets + extra, maxLogged, 1),
  );
  const isTime = exercise.trackingType === "TIME";
  const isBodyweight = exercise.trackingType === "BODYWEIGHT";

  async function onLogSet(setNumber: number) {
    if (pending) return;
    const key = `${exercise.id}-${setNumber}`;
    const rawValue = setValues[key];

    const payload: {
      sessionExerciseId: string;
      setNumber: number;
      weightKg?: number;
      durationSeconds?: number;
    } = { sessionExerciseId: exercise.id, setNumber };

    if (exercise.trackingType === "WEIGHTED") {
      const fallback = defaultInputValue(
        exercise.trackingType,
        exercise.sets.find((set) => set.setNumber === setNumber),
        previousForExercise.find((set) => set.setNumber === setNumber),
        exercise.targetWeightKg,
      );
      const source = rawValue ?? fallback;
      const weightKg = Number(source);
      if (!source && weightKg !== 0) {
        toast.error("Enter a weight for this set.");
        return;
      }
      payload.weightKg = weightKg;
    } else if (exercise.trackingType === "TIME") {
      const fallback = defaultInputValue(
        exercise.trackingType,
        exercise.sets.find((set) => set.setNumber === setNumber),
        previousForExercise.find((set) => set.setNumber === setNumber),
        null,
      );
      const source = rawValue ?? fallback;
      const durationSeconds = Number(source);
      if (!durationSeconds || durationSeconds < 1) {
        toast.error("Enter a duration in seconds for this set.");
        return;
      }
      payload.durationSeconds = durationSeconds;
    }

    await run(async () => {
      try {
        const result = await logWorkoutSet(payload);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success("Set saved.");
        router.refresh();
      } catch (error) {
        console.error("[workout] logWorkoutSet failed:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not save set. Please try again.",
        );
      }
    });
  }

  async function onComplete() {
    if (pending) return;
    await run(async () => {
      try {
        const result = await completeWorkoutSession(session.id);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success(result.message ?? "Workout completed.");
        router.refresh();
      } catch (error) {
        console.error("[workout] completeWorkoutSession failed:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not complete workout. Please try again.",
        );
      }
    });
  }

  function addSet() {
    if (rowCount >= MAX_SETS) {
      toast.error("You can log up to 20 sets.");
      return;
    }
    setAddedSets((prev) => ({
      ...prev,
      [exercise.id]: extra + 1,
    }));
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <LockedLink
          href="/member"
          aria-label="Back to overview"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-foreground hover:bg-muted"
        >
          <ChevronLeft className="h-5 w-5" />
        </LockedLink>
        <div className="flex min-w-0 flex-1 justify-center">
          <SessionTimer
            startedAt={toIsoTimestamp(session.startedAt)}
            compact
          />
        </div>
        <Button size="sm" onClick={onComplete} disabled={pending}>
          {pending ? "..." : "Finish"}
        </Button>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0"
          disabled={safeIndex === 0}
          aria-label="Previous exercise"
          onClick={() => setExerciseIndex((index) => Math.max(0, index - 1))}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Exercise {safeIndex + 1} of {total}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0"
          disabled={safeIndex >= total - 1}
          aria-label="Next exercise"
          onClick={() =>
            setExerciseIndex((index) => Math.min(total - 1, index + 1))
          }
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <div className="space-y-3">
        <h2 className="text-center font-display text-2xl font-bold leading-tight">
          {exercise.displayName}
        </h2>
        <RestTimer
          key={exercise.id}
          defaultSeconds={exercise.restSeconds}
          compact
        />
      </div>

      <div className="overflow-x-hidden">
        <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_4.5rem_2.5rem] items-center gap-x-2 px-1 pb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          <span>Set</span>
          <span>Prev</span>
          <span>{isTime ? "Sec" : isBodyweight ? "" : "KG"}</span>
          <span className="sr-only">Done</span>
        </div>
        <div className="space-y-1.5">
          {Array.from({ length: rowCount }, (_, index) => {
            const setNumber = index + 1;
            const key = `${exercise.id}-${setNumber}`;
            const logged = exercise.sets.find((set) => set.setNumber === setNumber);
            const previous = previousForExercise.find(
              (set) => set.setNumber === setNumber,
            );
            const isLogged = logged != null;
            const fallback = defaultInputValue(
              exercise.trackingType,
              logged,
              previous,
              exercise.targetWeightKg,
            );
            const value = setValues[key] ?? fallback;

            return (
              <div
                key={key}
                className={cn(
                  "grid grid-cols-[2.5rem_minmax(0,1fr)_4.5rem_2.5rem] items-center gap-x-2 rounded-xl px-1 py-2",
                  isLogged ? "bg-primary/10" : "bg-transparent",
                )}
              >
                <span className="text-center text-sm font-semibold">
                  {setNumber}
                </span>
                <span className="min-w-0 truncate text-sm text-muted-foreground">
                  {formatPrev(
                    previous,
                    exercise.trackingType,
                    exercise.targetReps,
                  )}
                </span>
                {isBodyweight ? (
                  <span className="text-center text-xs text-muted-foreground">
                    —
                  </span>
                ) : (
                  <Input
                    id={key}
                    type="number"
                    min={isTime ? 1 : 0}
                    step={isTime ? 1 : 0.5}
                    inputMode="decimal"
                    value={value}
                    aria-label={
                      isTime
                        ? `Set ${setNumber} seconds`
                        : `Set ${setNumber} kilograms`
                    }
                    className="h-9 px-2 text-center"
                    onChange={(event) =>
                      setSetValues((prev) => ({
                        ...prev,
                        [key]: event.target.value,
                      }))
                    }
                  />
                )}
                <button
                  type="button"
                  disabled={pending}
                  aria-pressed={isLogged}
                  aria-label={
                    isLogged
                      ? `Set ${setNumber} saved`
                      : isBodyweight
                        ? `Mark set ${setNumber} done`
                        : `Save set ${setNumber}`
                  }
                  onClick={() => onLogSet(setNumber)}
                  className={cn(
                    "mx-auto flex h-7 w-7 items-center justify-center rounded-md ring-1 transition-colors",
                    isLogged
                      ? "bg-primary text-primary-foreground ring-primary"
                      : "bg-muted/60 text-transparent ring-border",
                  )}
                >
                  <Check className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full gap-2"
        onClick={addSet}
        disabled={pending || rowCount >= MAX_SETS}
      >
        <Plus className="h-4 w-4" />
        Add Set
      </Button>
    </div>
  );
}
