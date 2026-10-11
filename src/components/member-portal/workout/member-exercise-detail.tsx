"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { getMemberExerciseLibraryDetailAction } from "@/app/actions/member-exercise-library";
import {
  addExerciseToPersonalWorkoutAction,
  createMemberPersonalWorkoutAction,
  listMemberPersonalWorkoutsAction,
} from "@/app/actions/member-personal-workouts";
import { MemberExerciseDestinationPicker } from "@/components/member-portal/workout/member-exercise-destination-picker";
import { MemberExerciseWatchDemoLink } from "@/components/member-portal/workout/member-exercise-watch-demo-link";
import type { MemberLibraryMuscleFilter } from "@/lib/member-portal/member-library-muscle-groups";
import { pickDefaultPersonalWorkoutId } from "@/lib/member-portal/member-exercise-destination";
import { muscleGroupLabel } from "@/lib/muscle-groups";
import type { MemberCatalogExerciseDetail } from "@/lib/workout-tracking/member-catalog-exercises";
import type { MemberPersonalWorkoutSummary } from "@/lib/workout-tracking/member-personal-workouts";
import { cn } from "@/lib/utils";

type MemberExerciseDetailProps = {
  catalogId: string;
  addToWorkoutId?: string | null;
  libraryGroup?: MemberLibraryMuscleFilter | null;
};

function formatMuscleSlug(slug: string): string {
  return slug.replace(/_/g, " ");
}

export function MemberExerciseDetail({
  catalogId,
  addToWorkoutId,
  libraryGroup = null,
}: MemberExerciseDetailProps) {
  const [detail, setDetail] = React.useState<MemberCatalogExerciseDetail | null>(
    null,
  );
  const [workouts, setWorkouts] = React.useState<MemberPersonalWorkoutSummary[]>(
    [],
  );
  const [loading, setLoading] = React.useState(true);
  const [adding, setAdding] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [pickWorkoutId, setPickWorkoutId] = React.useState(
    addToWorkoutId?.trim() ?? "",
  );

  const applyWorkoutList = React.useCallback(
    (rows: MemberPersonalWorkoutSummary[]) => {
      setWorkouts(rows);
      setPickWorkoutId((current) =>
        pickDefaultPersonalWorkoutId(rows, addToWorkoutId?.trim() || current),
      );
    },
    [addToWorkoutId],
  );

  const loadWorkouts = React.useCallback(async () => {
    const listResult = await listMemberPersonalWorkoutsAction();
    if (!listResult.ok) return false;
    applyWorkoutList(listResult.data ?? []);
    return true;
  }, [applyWorkoutList]);

  React.useEffect(() => {
    let cancelled = false;
    void Promise.all([
      getMemberExerciseLibraryDetailAction({ catalogId }),
      listMemberPersonalWorkoutsAction(),
    ]).then(([detailResult, listResult]) => {
      if (cancelled) return;
      if (!detailResult.ok || !detailResult.data) {
        toast.error(
          !detailResult.ok ? detailResult.error : "Could not load exercise.",
        );
      } else {
        setDetail(detailResult.data);
      }
      if (listResult.ok && listResult.data) {
        applyWorkoutList(listResult.data);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [catalogId, applyWorkoutList]);

  React.useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") void loadWorkouts();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadWorkouts]);

  async function onCreateWorkout() {
    if (creating) return;
    setCreating(true);
    try {
      const result = await createMemberPersonalWorkoutAction({});
      if (!result.ok || !result.data) {
        toast.error(!result.ok ? result.error : "Could not create workout.");
        return;
      }
      const workoutId = result.data.workoutId;
      await loadWorkouts();
      setPickWorkoutId(workoutId);
      toast.success("Workout created. You can add this exercise below.");
    } finally {
      setCreating(false);
    }
  }

  async function onAdd() {
    const workoutId = pickWorkoutId.trim();
    if (!workoutId || adding) return;
    setAdding(true);
    try {
      const result = await addExerciseToPersonalWorkoutAction({
        workoutId,
        catalogId,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Exercise added.");
      await loadWorkouts();
    } finally {
      setAdding(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!detail) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Exercise not found.
      </p>
    );
  }

  const imageUrl =
    detail.media?.primaryImageUrl ?? detail.media?.thumbnailUrl ?? null;

  return (
    <div
      className="relative pb-[calc(9.5rem+4.25rem+env(safe-area-inset-bottom,0px))]"
    >
      <div className="member-workout-card overflow-hidden">
        <div className="relative aspect-[4/3] w-full bg-gradient-to-b from-muted/20 to-card">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={detail.name}
              className="h-full w-full object-contain p-4"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Illustration unavailable
            </div>
          )}
        </div>
        <div className="space-y-3 p-4">
          <div>
            <h1 className="font-display text-2xl font-bold leading-tight">
              {detail.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {muscleGroupLabel(detail.muscleGroup)}
              {detail.equipment ? ` · ${detail.equipment}` : ""}
              {detail.difficulty ? ` · ${detail.difficulty}` : ""}
            </p>
          </div>

          {detail.primaryMuscles.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {detail.primaryMuscles.map((muscle) => (
                <span
                  key={muscle}
                  className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium capitalize text-primary"
                >
                  {formatMuscleSlug(muscle)}
                </span>
              ))}
            </div>
          ) : null}

          {detail.youtubeUrl ? (
            <MemberExerciseWatchDemoLink youtubeUrl={detail.youtubeUrl} />
          ) : null}

          {detail.description ? (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {detail.description}
            </p>
          ) : null}

          {detail.instructions.length > 0 ? (
            <div>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Instructions
              </h2>
              <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed">
                {detail.instructions.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          ) : null}
        </div>
      </div>

      <div
        className={cn(
          "fixed inset-x-0 z-30 border-t border-border/80 bg-card/95 px-3 py-2.5 backdrop-blur-md",
          "bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))]",
        )}
      >
        <div className="mx-auto max-w-2xl">
          <MemberExerciseDestinationPicker
            catalogId={catalogId}
            workouts={workouts}
            selectedWorkoutId={pickWorkoutId}
            onSelectWorkoutId={setPickWorkoutId}
            onCreateWorkout={() => void onCreateWorkout()}
            onAdd={() => void onAdd()}
            adding={adding}
            creating={creating}
          />
        </div>
      </div>
    </div>
  );
}
