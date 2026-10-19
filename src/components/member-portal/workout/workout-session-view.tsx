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
import { ExerciseMedia } from "@/components/exercise-media";
import { MemberExerciseWatchDemoLink } from "@/components/member-portal/workout/member-exercise-watch-demo-link";
import { clearRestTimersForSession } from "@/lib/workout-tracking/rest-timer-storage";
import { SessionTimer } from "@/components/member-portal/workout/session-timer";
import { LockedLink } from "@/components/navigation/locked-link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { parseTargetReps } from "@/lib/workout-tracking/progress-format";
import { cn } from "@/lib/utils";
import type {
  ActiveWorkoutSession,
  ActiveWorkoutSetLog,
  PreviousSetLog,
} from "@/lib/workout-tracking/types";

const MAX_SETS = 20;

const WORKOUT_TOAST_ID = "member-workout-session-toast";

function showWorkoutToast(
  message: string,
  variant: "success" | "error",
): void {
  toast.dismiss(WORKOUT_TOAST_ID);
  const options = {
    id: WORKOUT_TOAST_ID,
    position: "bottom-center" as const,
    duration: variant === "error" ? 3500 : 2200,
    className:
      "!bg-card !text-foreground border border-border shadow-lg mb-[max(5.25rem,env(safe-area-inset-bottom))]",
  };
  if (variant === "success") {
    toast.success(message, options);
  } else {
    toast.error(message, options);
  }
}

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

function mergeLoggedSet(
  session: ActiveWorkoutSession,
  sessionExerciseId: string,
  set: ActiveWorkoutSetLog,
): ActiveWorkoutSession {
  return {
    ...session,
    exercises: session.exercises.map((exercise) => {
      if (exercise.id !== sessionExerciseId) {
        return exercise;
      }

      const sets = [...exercise.sets];
      const index = sets.findIndex((row) => row.setNumber === set.setNumber);
      if (index >= 0) {
        sets[index] = set;
      } else {
        sets.push(set);
        sets.sort((a, b) => a.setNumber - b.setNumber);
      }

      return { ...exercise, sets };
    }),
  };
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
  previousSetsReady?: boolean;
};

export function WorkoutSessionView({
  session: initialSession,
  previousSets,
  previousSetsReady = true,
}: WorkoutSessionViewProps) {
  const router = useRouter();
  const [, startTransition] = React.useTransition();
  const [session, setSession] = React.useState(initialSession);
  const [savingSetKeys, setSavingSetKeys] = React.useState<Set<string>>(
    () => new Set(),
  );
  const [completing, setCompleting] = React.useState(false);
  const [exerciseIndex, setExerciseIndex] = React.useState(() =>
    firstIncompleteIndex(initialSession),
  );
  const [addedSets, setAddedSets] = React.useState<Record<string, number>>({});
  const [setValues, setSetValues] = React.useState<Record<string, string>>({});
  const [editedSetKeys, setEditedSetKeys] = React.useState<Set<string>>(
    () => new Set(),
  );
  const [emptyFinishOpen, setEmptyFinishOpen] = React.useState(false);

  React.useEffect(() => {
    setSession(initialSession);
    setExerciseIndex(firstIncompleteIndex(initialSession));
  }, [initialSession]);

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
    const key = `${exercise.id}-${setNumber}`;
    if (savingSetKeys.has(key)) return;
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
        showWorkoutToast("Enter a weight for this set.", "error");
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
        showWorkoutToast("Enter a duration in seconds for this set.", "error");
        return;
      }
      payload.durationSeconds = durationSeconds;
    } else if (exercise.trackingType === "BODYWEIGHT") {
      const reps = parseTargetReps(exercise.targetReps);
      if (reps != null) {
        payload.weightKg = reps;
      }
    }

    const optimisticSet: ActiveWorkoutSetLog = {
      setNumber: payload.setNumber,
      weightKg: payload.weightKg ?? null,
      durationSeconds: payload.durationSeconds ?? null,
    };
    const sessionBeforeSave = session;

    setSavingSetKeys((prev) => new Set(prev).add(key));
    setSession((current) =>
      mergeLoggedSet(current, exercise.id, optimisticSet),
    );

    try {
      const result = await logWorkoutSet(payload);
      if (!result.ok) {
        setSession(sessionBeforeSave);
        showWorkoutToast(result.error, "error");
        return;
      }
      if (result.data) {
        const { sessionExerciseId, set } = result.data;
        setSession((current) =>
          mergeLoggedSet(current, sessionExerciseId, set),
        );
      }
      showWorkoutToast("Set saved.", "success");
    } catch (error) {
      setSession(sessionBeforeSave);
      console.error("[workout] logWorkoutSet failed:", error);
      showWorkoutToast(
        error instanceof Error
          ? error.message
          : "Could not save set. Please try again.",
        "error",
      );
    } finally {
      setSavingSetKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  const hasPendingSaves = savingSetKeys.size > 0;

  async function runComplete(confirmEmptyFinish = false) {
    if (completing || hasPendingSaves) {
      if (hasPendingSaves) {
        showWorkoutToast("Wait for sets to finish saving.", "error");
      }
      return;
    }
    setCompleting(true);
    try {
      const result = await completeWorkoutSession(
        session.id,
        confirmEmptyFinish,
      );
      if (!result.ok) {
        if (result.error === "WORKOUT_EMPTY_CONFIRMATION_REQUIRED") {
          setEmptyFinishOpen(true);
          return;
        }
        showWorkoutToast(result.error, "error");
        return;
      }
      setEmptyFinishOpen(false);
      if (result.message && result.message !== "Workout closed.") {
        showWorkoutToast(result.message, "success");
      }
      clearRestTimersForSession(session.id);
      startTransition(() => {
        router.push("/member");
        router.refresh();
      });
    } catch (error) {
      console.error("[workout] completeWorkoutSession failed:", error);
      showWorkoutToast(
        error instanceof Error
          ? error.message
          : "Could not complete workout. Please try again.",
        "error",
      );
    } finally {
      setCompleting(false);
    }
  }

  async function onComplete() {
    await runComplete(false);
  }

  function addSet() {
    if (rowCount >= MAX_SETS) {
      showWorkoutToast("You can log up to 20 sets.", "error");
      return;
    }
    setAddedSets((prev) => ({
      ...prev,
      [exercise.id]: extra + 1,
    }));
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-lg space-y-4 overflow-x-hidden pb-1">
      <div className="sticky top-0 z-20 -mx-0.5 flex min-w-0 items-center gap-2 bg-background/95 pb-2 pt-0.5 backdrop-blur-sm">
        <LockedLink
          href="/member"
          aria-label="Back to overview"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-foreground hover:bg-muted"
        >
          <ChevronLeft className="h-5 w-5" />
        </LockedLink>
        <div className="flex min-w-0 flex-1 justify-center">
          <SessionTimer
            startedAt={toIsoTimestamp(session.startedAt)}
            compact
          />
        </div>
        <Button
          size="sm"
          className="h-9 shrink-0 px-3"
          onClick={onComplete}
          disabled={completing || hasPendingSaves}
        >
          {completing ? "..." : "Finish"}
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
        <h2 className="break-words px-1 text-center font-display text-xl font-bold leading-tight sm:text-2xl">
          {exercise.displayName}
        </h2>
        <ExerciseMedia
          media={exercise.media}
          alt={`${exercise.displayName} demonstration`}
          variant="thumbnail"
          compact
          emptyLabel=""
          className="mx-auto h-24 w-full max-w-[10.5rem] rounded-2xl bg-muted/50 ring-1 ring-border/60 sm:h-28 sm:max-w-[12rem]"
        />
        {exercise.youtubeUrl ? (
          <div className="flex justify-center overflow-x-hidden">
            <MemberExerciseWatchDemoLink
              youtubeUrl={exercise.youtubeUrl}
              compact
            />
          </div>
        ) : null}
        <RestTimer
          key={exercise.id}
          sessionId={session.id}
          exerciseId={exercise.id}
          defaultSeconds={exercise.restSeconds}
          compact
        />
      </div>

      <div className="overflow-x-hidden">
        <div className="grid grid-cols-[1.75rem_minmax(0,1fr)_minmax(3.25rem,4rem)_1.75rem] items-center gap-x-1.5 px-0.5 pb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:grid-cols-[2rem_minmax(0,1fr)_4rem_2rem] sm:gap-x-2 sm:text-[11px]">
          <span>Set</span>
          <span>Prev</span>
          <span className="text-center whitespace-nowrap">
            {isTime ? "Sec" : isBodyweight ? "" : "KG"}
          </span>
          <span className="sr-only">Done</span>
        </div>
        <div className="space-y-1.5">
          {!previousSetsReady
            ? Array.from({ length: Math.min(rowCount, 4) }, (_, index) => (
                <div
                  key={index}
                  className="h-11 w-full animate-pulse rounded-xl bg-muted/50"
                />
              ))
            : null}
          {previousSetsReady
            ? Array.from({ length: rowCount }, (_, index) => {
            const setNumber = index + 1;
            const key = `${exercise.id}-${setNumber}`;
            const logged = exercise.sets.find((set) => set.setNumber === setNumber);
            const previous = previousForExercise.find(
              (set) => set.setNumber === setNumber,
            );
            const isLogged = logged != null;
            const isSaving = savingSetKeys.has(key);
            const fallback = defaultInputValue(
              exercise.trackingType,
              logged,
              previous,
              exercise.targetWeightKg,
            );
            const value =
              setValues[key] ?? (editedSetKeys.has(key) ? "" : fallback);

            return (
              <div
                key={key}
                className={cn(
                  "grid grid-cols-[1.75rem_minmax(0,1fr)_minmax(3.25rem,4rem)_1.75rem] items-center gap-x-1.5 rounded-xl px-0.5 py-1.5 sm:grid-cols-[2rem_minmax(0,1fr)_4rem_2rem] sm:gap-x-2 sm:px-1 sm:py-2",
                  isLogged ? "bg-primary/10" : "bg-transparent",
                )}
              >
                <span className="text-center text-xs font-semibold tabular-nums sm:text-sm">
                  {setNumber}
                </span>
                <span className="min-w-0 truncate text-xs tabular-nums text-muted-foreground sm:text-sm">
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
                    className="h-9 min-w-0 px-1 text-center text-sm tabular-nums sm:px-2"
                    onChange={(event) => {
                      setEditedSetKeys((prev) => new Set(prev).add(key));
                      setSetValues((prev) => ({
                        ...prev,
                        [key]: event.target.value,
                      }));
                    }}
                  />
                )}
                <button
                  type="button"
                  disabled={isSaving}
                  aria-busy={isSaving}
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
          })
            : null}
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full gap-2"
        onClick={addSet}
        disabled={rowCount >= MAX_SETS || !previousSetsReady}
      >
        <Plus className="h-4 w-4" />
        Add Set
      </Button>

      <Dialog open={emptyFinishOpen} onOpenChange={setEmptyFinishOpen}>
        <DialogContent className="rounded-2xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Finish early?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            You haven&apos;t logged any sets. Finishing now won&apos;t count as a
            completed workout or gym visit.
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEmptyFinishOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void runComplete(true)}
              disabled={completing}
            >
              Finish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
