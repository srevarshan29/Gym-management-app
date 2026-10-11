"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  deleteMemberPersonalWorkoutAction,
  getMemberPersonalWorkoutAction,
  saveMemberPersonalWorkoutAction,
} from "@/app/actions/member-personal-workouts";
import { useRegisterBeforeNavigate } from "@/components/navigation/navigation-lock-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  memberPersonalWorkoutAddExercisesHref,
  memberWorkoutPageHref,
} from "@/lib/member-portal/member-workout-tab-url";
import {
  flushBeforePersonalWorkoutNavigation,
  PersonalWorkoutAutosaveRunner,
  type PersonalWorkoutAutosaveStatus,
} from "@/lib/member-portal/personal-workout-editor-autosave";
import { cn } from "@/lib/utils";
import { reorderPersonalWorkoutExercises } from "@/lib/workout-tracking/member-personal-workout-exercise-order";

type EditorExercise = {
  id: string;
  catalogId: string;
  sortOrder: number;
  targetSets: number;
  targetReps: string;
  displayName: string;
};

type MemberPersonalWorkoutEditorProps = {
  workoutId: string;
  /** When set, renders header Back with flush-before-navigate. */
  backHref?: string;
};

function AutosaveStatusLine({
  status,
  onRetry,
}: {
  status: PersonalWorkoutAutosaveStatus;
  onRetry: () => void;
}) {
  if (status === "saving" || status === "pending") {
    return (
      <p className="text-xs text-muted-foreground" aria-live="polite">
        Saving…
      </p>
    );
  }
  if (status === "saved") {
    return (
      <p className="text-xs text-muted-foreground" aria-live="polite">
        Saved
      </p>
    );
  }
  if (status === "error") {
    return (
      <button
        type="button"
        className="text-xs font-medium text-destructive underline-offset-2 hover:underline"
        onClick={onRetry}
      >
        Save failed — Retry
      </button>
    );
  }
  return null;
}

export function MemberPersonalWorkoutEditor({
  workoutId,
  backHref = memberWorkoutPageHref({ tab: "mine" }),
}: MemberPersonalWorkoutEditorProps) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [exercises, setExercises] = React.useState<EditorExercise[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [autosaveStatus, setAutosaveStatus] =
    React.useState<PersonalWorkoutAutosaveStatus>("idle");
  const [navigatingAway, setNavigatingAway] = React.useState(false);
  const navigationFlushRef = React.useRef<Promise<boolean> | null>(null);

  const nameRef = React.useRef(name);
  const exercisesRef = React.useRef(exercises);
  nameRef.current = name;
  exercisesRef.current = exercises;

  const autosaveRef = React.useRef<PersonalWorkoutAutosaveRunner | null>(null);

  React.useEffect(() => {
    const runner = new PersonalWorkoutAutosaveRunner({
      getState: () => ({
        workoutId,
        name: nameRef.current,
        exercises: exercisesRef.current,
      }),
      save: async (body) => {
        const result = await saveMemberPersonalWorkoutAction(body);
        if (result.ok) {
          router.refresh();
        }
        return { ok: result.ok };
      },
      onStatusChange: setAutosaveStatus,
    });
    autosaveRef.current = runner;
    return () => {
      runner.disable();
      autosaveRef.current = null;
    };
  }, [workoutId, router]);

  React.useEffect(() => {
    let cancelled = false;
    autosaveRef.current?.disable();
    setLoading(true);
    void getMemberPersonalWorkoutAction(workoutId).then((result) => {
      if (cancelled) return;
      if (!result.ok || !result.data) {
        toast.error(
          !result.ok ? result.error : "Workout not found.",
        );
        setLoading(false);
        return;
      }
      setName(result.data.name);
      setExercises(result.data.exercises);
      setLoading(false);
      autosaveRef.current?.enableAfterHydration();
    });
    return () => {
      cancelled = true;
    };
  }, [workoutId]);

  const flushForLeave = React.useCallback(async () => {
    const ok = await flushBeforePersonalWorkoutNavigation(
      autosaveRef.current,
      navigationFlushRef,
    );
    if (!ok) {
      toast.error("Could not save workout. Use Retry, then try again.");
    }
    return ok;
  }, []);

  useRegisterBeforeNavigate(loading ? null : flushForLeave);

  function markDirty() {
    autosaveRef.current?.markDirty();
  }

  function moveExercise(id: string, direction: -1 | 1) {
    const index = exercises.findIndex((e) => e.id === id);
    if (index < 0) return;
    const target = index + direction;
    if (target < 0 || target >= exercises.length) return;
    const ids = exercises.map((e) => e.id);
    const swapped = [...ids];
    [swapped[index], swapped[target]] = [swapped[target], swapped[index]];
    const reordered = reorderPersonalWorkoutExercises(
      exercises.map((e) => ({
        id: e.id,
        catalogId: e.catalogId,
        sortOrder: e.sortOrder,
        targetSets: e.targetSets,
        targetReps: e.targetReps,
      })),
      swapped,
    );
    setExercises(
      reordered.map((row) => {
        const prev = exercises.find((e) => e.id === row.id)!;
        return { ...prev, sortOrder: row.sortOrder };
      }),
    );
    markDirty();
  }

  function removeExercise(id: string) {
    setExercises((prev) =>
      prev
        .filter((e) => e.id !== id)
        .map((e, i) => ({ ...e, sortOrder: i })),
    );
    markDirty();
  }

  async function navigateAway(href: string) {
    if (navigatingAway) return;
    setNavigatingAway(true);
    try {
      const ok = await flushForLeave();
      if (!ok) return;
      router.push(href);
    } finally {
      setNavigatingAway(false);
    }
  }

  async function onAddExercises() {
    await navigateAway(memberPersonalWorkoutAddExercisesHref(workoutId));
  }

  async function onDelete() {
    if (!window.confirm("Delete this workout?")) return;
    const result = await deleteMemberPersonalWorkoutAction(workoutId);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Deleted.");
    router.push("/member/workout?tab=mine");
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const navigationBusy =
    navigatingAway ||
    autosaveStatus === "saving" ||
    autosaveStatus === "pending";

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={navigatingAway}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          onClick={() => void navigateAway(backHref)}
        >
          {navigatingAway ? "Saving…" : "Back"}
        </button>
        <h1 className="font-display text-lg font-bold">Edit workout</h1>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            markDirty();
          }}
          className="h-12 flex-1 text-base font-medium"
          placeholder="Workout name"
          maxLength={80}
        />
        <AutosaveStatusLine
          status={autosaveStatus}
          onRetry={() => autosaveRef.current?.retry()}
        />
      </div>

      <Button
        type="button"
        variant="outline"
        className="h-11 w-full"
        disabled={navigationBusy}
        onClick={() => void onAddExercises()}
      >
        {navigatingAway ? "Saving…" : "Add exercise"}
      </Button>

      {exercises.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No exercises yet. Browse the library to add some.
        </p>
      ) : (
        <ul className="space-y-3">
          {exercises.map((exercise, index) => (
            <li
              key={exercise.id}
              className="member-workout-card space-y-2 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium leading-snug">{exercise.displayName}</p>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    className="flex h-10 w-10 items-center justify-center rounded-lg border"
                    aria-label="Move up"
                    disabled={index === 0}
                    onClick={() => moveExercise(exercise.id, -1)}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="flex h-10 w-10 items-center justify-center rounded-lg border"
                    aria-label="Move down"
                    disabled={index === exercises.length - 1}
                    onClick={() => moveExercise(exercise.id, 1)}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="flex h-10 w-10 items-center justify-center rounded-lg border text-destructive"
                    aria-label="Remove"
                    onClick={() => removeExercise(exercise.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Sets</label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    className="h-11 text-base"
                    value={exercise.targetSets}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setExercises((prev) =>
                        prev.map((row) =>
                          row.id === exercise.id
                            ? { ...row, targetSets: v }
                            : row,
                        ),
                      );
                      markDirty();
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Reps</label>
                  <Input
                    className="h-11 text-base"
                    value={exercise.targetReps}
                    maxLength={40}
                    onChange={(e) => {
                      setExercises((prev) =>
                        prev.map((row) =>
                          row.id === exercise.id
                            ? { ...row, targetReps: e.target.value }
                            : row,
                        ),
                      );
                      markDirty();
                    }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Button
        type="button"
        variant="ghost"
        className="h-11 w-full text-destructive"
        onClick={() => void onDelete()}
      >
        Delete workout
      </Button>
    </div>
  );
}
