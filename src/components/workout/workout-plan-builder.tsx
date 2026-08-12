"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import { saveWorkoutPlan } from "@/app/actions/workout-plans";
import { LockedLink } from "@/components/navigation/locked-link";
import { useSharedNavigationLock } from "@/components/navigation/navigation-lock-provider";
import { useActionLock } from "@/hooks/use-action-lock";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MUSCLE_GROUP_OPTIONS, muscleGroupLabel } from "@/lib/exercises";
import type { MemberOption } from "@/lib/programme-types";
import type {
  ExerciseListItem,
  WorkoutPlanDetail,
  WorkoutPlanExerciseInput,
} from "@/lib/workout-tracking/types";
import type { MuscleGroup } from "@prisma/client";

type DraftExercise = WorkoutPlanExerciseInput & {
  key: string;
  displayName: string;
  muscleGroup: string | null;
};

function emptyDraftFromLibrary(item: ExerciseListItem): DraftExercise {
  return {
    key: `lib-${item.id}-${Date.now()}`,
    exerciseId: item.id,
    customName: "",
    displayName: item.name,
    muscleGroup: muscleGroupLabel(item.muscleGroup as MuscleGroup),
    targetSets: item.defaultSets ?? 3,
    targetReps: item.defaultReps ?? "10",
    tempo: item.defaultTempo ?? "",
    restSeconds: item.defaultRestSeconds ?? 60,
    targetWeightKg: null,
  };
}

function draftFromPlanRow(row: WorkoutPlanDetail["exercises"][number]): DraftExercise {
  return {
    key: row.id,
    exerciseId: row.exerciseId ?? "",
    customName: row.customName ?? "",
    displayName: row.displayName,
    muscleGroup: row.muscleGroup,
    targetSets: row.targetSets,
    targetReps: row.targetReps,
    tempo: row.tempo ?? "",
    restSeconds: row.restSeconds,
    targetWeightKg: row.targetWeightKg,
  };
}

type WorkoutPlanBuilderProps = {
  members: MemberOption[];
  library: ExerciseListItem[];
  plan?: WorkoutPlanDetail;
  fixedMemberId?: string;
};

export function WorkoutPlanBuilder({
  members,
  library,
  plan,
  fixedMemberId,
}: WorkoutPlanBuilderProps) {
  const [memberId, setMemberId] = React.useState(
    plan?.memberId ?? fixedMemberId ?? members[0]?.id ?? "",
  );
  const [title, setTitle] = React.useState(plan?.title ?? "");
  const [durationWeeks, setDurationWeeks] = React.useState(
    plan?.durationWeeks != null ? String(plan.durationWeeks) : "",
  );
  const [focusGoal, setFocusGoal] = React.useState(plan?.focusGoal ?? "");
  const [rows, setRows] = React.useState<DraftExercise[]>(
    plan?.exercises.map(draftFromPlanRow) ?? [],
  );
  const [query, setQuery] = React.useState("");
  const [muscleFilter, setMuscleFilter] = React.useState<string>("ALL");
  const { navigate } = useSharedNavigationLock();
  const { run, isPending: pending } = useActionLock();

  const filteredLibrary = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return library.filter((item) => {
      if (muscleFilter !== "ALL" && item.muscleGroup !== muscleFilter) {
        return false;
      }
      if (!q) return true;
      return item.name.toLowerCase().includes(q);
    });
  }, [library, query, muscleFilter]);

  function addFromLibrary(item: ExerciseListItem) {
    setRows((prev) => [...prev, emptyDraftFromLibrary(item)]);
  }

  function addCustomRow() {
    setRows((prev) => [
      ...prev,
      {
        key: `custom-${Date.now()}`,
        exerciseId: "",
        customName: "",
        displayName: "Custom exercise",
        muscleGroup: null,
        targetSets: 3,
        targetReps: "10",
        tempo: "",
        restSeconds: 60,
        targetWeightKg: null,
      },
    ]);
  }

  function updateRow(key: string, patch: Partial<DraftExercise>) {
    setRows((prev) =>
      prev.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  function moveRow(key: string, direction: -1 | 1) {
    setRows((prev) => {
      const index = prev.findIndex((row) => row.key === key);
      if (index < 0) return prev;
      const next = index + direction;
      if (next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(next, 0, item!);
      return copy;
    });
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((row) => row.key !== key));
  }

  async function onSave() {
    if (!memberId) {
      toast.error("Select a member.");
      return;
    }
    if (!title.trim()) {
      toast.error("Enter a plan title.");
      return;
    }
    if (rows.length === 0) {
      toast.error("Add at least one exercise.");
      return;
    }

    await run(async () => {
      try {
        const result = await saveWorkoutPlan({
        memberId,
        title: title.trim(),
        durationWeeks: durationWeeks ? Number(durationWeeks) : null,
        focusGoal,
        exercises: rows.map((row) => ({
          exerciseId: row.exerciseId || "",
          customName: row.customName || "",
          targetSets: row.targetSets,
          targetReps: row.targetReps,
          tempo: row.tempo || "",
          restSeconds: row.restSeconds,
          targetWeightKg: row.targetWeightKg,
        })),
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(result.message ?? "Workout plan saved.");
      navigate("/programmes/workout", undefined, { refresh: true });
      } catch (error) {
        console.error("[workout-plan] saveWorkoutPlan failed:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not save workout plan. Please try again.",
        );
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Program details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!plan && !fixedMemberId ? (
              <div className="space-y-2">
                <Label>Member</Label>
                <Select value={memberId} onValueChange={setMemberId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select member" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Member: <span className="font-medium text-foreground">{plan?.memberName}</span>
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="plan-title">Plan title</Label>
              <Input
                id="plan-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Strength block A"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="duration-weeks">Duration (weeks)</Label>
                <Input
                  id="duration-weeks"
                  type="number"
                  min={1}
                  max={52}
                  value={durationWeeks}
                  onChange={(e) => setDurationWeeks(e.target.value)}
                  placeholder="4"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="focus-goal">This month&apos;s focus / goal</Label>
              <Textarea
                id="focus-goal"
                value={focusGoal}
                onChange={(e) => setFocusGoal(e.target.value)}
                placeholder="e.g. Build upper-body strength and improve squat form"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">Exercises in plan</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addCustomRow}>
              <Plus className="h-4 w-4" /> Custom
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Pick exercises from the library on the right, or add a custom exercise.
              </p>
            ) : (
              rows.map((row, index) => (
                <div
                  key={row.key}
                  className="rounded-xl border border-border bg-muted/20 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{row.displayName}</p>
                      {row.muscleGroup ? (
                        <p className="text-xs text-muted-foreground">{row.muscleGroup}</p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => moveRow(row.key, -1)}
                        disabled={index === 0}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => moveRow(row.key, 1)}
                        disabled={index === rows.length - 1}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeRow(row.key)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {!row.exerciseId ? (
                    <div className="space-y-2">
                      <Label>Custom exercise name</Label>
                      <Input
                        value={row.customName}
                        onChange={(e) =>
                          updateRow(row.key, {
                            customName: e.target.value,
                            displayName: e.target.value || "Custom exercise",
                          })
                        }
                        placeholder="Exercise name"
                      />
                    </div>
                  ) : null}

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Target sets</Label>
                      <Input
                        type="number"
                        min={1}
                        max={20}
                        value={row.targetSets}
                        onChange={(e) =>
                          updateRow(row.key, { targetSets: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Target reps</Label>
                      <Input
                        value={row.targetReps}
                        onChange={(e) =>
                          updateRow(row.key, { targetReps: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Target weight (kg)</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.5}
                        value={row.targetWeightKg ?? ""}
                        onChange={(e) =>
                          updateRow(row.key, {
                            targetWeightKg: e.target.value
                              ? Number(e.target.value)
                              : null,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tempo</Label>
                      <Input
                        value={row.tempo}
                        onChange={(e) => updateRow(row.key, { tempo: e.target.value })}
                        placeholder="3-1-2-0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Rest (seconds)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={row.restSeconds ?? ""}
                        onChange={(e) =>
                          updateRow(row.key, {
                            restSeconds: e.target.value
                              ? Number(e.target.value)
                              : null,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" asChild disabled={pending}>
            <LockedLink href="/programmes/workout">Cancel</LockedLink>
          </Button>
          <Button type="button" onClick={onSave} disabled={pending}>
            {pending ? "Saving..." : "Save workout plan"}
          </Button>
        </div>
      </div>

      <Card className="h-fit lg:sticky lg:top-4">
        <CardHeader>
          <CardTitle className="text-base">Exercise library</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search exercises..."
              className="pl-9"
            />
          </div>
          <Select value={muscleFilter} onValueChange={setMuscleFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Muscle group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All groups</SelectItem>
              {MUSCLE_GROUP_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
            {filteredLibrary.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => addFromLibrary(item)}
                className="flex w-full items-center justify-between rounded-lg border border-border bg-card/60 px-3 py-2 text-left text-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <span>
                  <span className="font-medium">{item.name}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {muscleGroupLabel(item.muscleGroup as MuscleGroup)}
                  </span>
                </span>
                <Plus className="h-4 w-4 shrink-0 text-primary" />
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
