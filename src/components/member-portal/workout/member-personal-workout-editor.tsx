"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  deleteMemberPersonalWorkoutAction,
  getMemberPersonalWorkoutAction,
  saveMemberPersonalWorkoutAction,
} from "@/app/actions/member-personal-workouts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
};

export function MemberPersonalWorkoutEditor({
  workoutId,
}: MemberPersonalWorkoutEditorProps) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [exercises, setExercises] = React.useState<EditorExercise[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
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
    });
    return () => {
      cancelled = true;
    };
  }, [workoutId]);

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
  }

  function removeExercise(id: string) {
    setExercises((prev) =>
      prev
        .filter((e) => e.id !== id)
        .map((e, i) => ({ ...e, sortOrder: i })),
    );
  }

  async function onSave() {
    if (saving) return;
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Enter a workout name.");
      return;
    }
    setSaving(true);
    try {
      const result = await saveMemberPersonalWorkoutAction({
        workoutId,
        name: trimmed,
        exercises: exercises.map((e) => ({
          id: e.id,
          catalogId: e.catalogId,
          sortOrder: e.sortOrder,
          targetSets: e.targetSets,
          targetReps: e.targetReps,
        })),
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Saved.");
      router.refresh();
    } finally {
      setSaving(false);
    }
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

  return (
    <div className="space-y-4 pb-8">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="h-12 text-base font-medium"
        placeholder="Workout name"
        maxLength={80}
      />

      <Button type="button" variant="outline" className="h-11 w-full" asChild>
        <Link href={`/member/workout?tab=library&addTo=${workoutId}`}>
          Add from library
        </Link>
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
              className="rounded-xl border p-3 space-y-2"
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
        className="h-12 w-full text-base"
        onClick={() => void onSave()}
        disabled={saving}
      >
        {saving ? "Saving…" : "Save workout"}
      </Button>

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
