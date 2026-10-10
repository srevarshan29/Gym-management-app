"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { getMemberExerciseLibraryDetailAction } from "@/app/actions/member-exercise-library";
import {
  addExerciseToPersonalWorkoutAction,
  listMemberPersonalWorkoutsAction,
} from "@/app/actions/member-personal-workouts";
import { MemberExerciseWatchDemoLink } from "@/components/member-portal/workout/member-exercise-watch-demo-link";
import { Button } from "@/components/ui/button";
import type { MemberLibraryMuscleFilter } from "@/lib/member-portal/member-library-muscle-groups";
import { memberWorkoutPageHref } from "@/lib/member-portal/member-workout-tab-url";
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
  const router = useRouter();
  const [detail, setDetail] = React.useState<MemberCatalogExerciseDetail | null>(
    null,
  );
  const [workouts, setWorkouts] = React.useState<MemberPersonalWorkoutSummary[]>(
    [],
  );
  const [loading, setLoading] = React.useState(true);
  const [adding, setAdding] = React.useState(false);
  const [pickWorkoutId, setPickWorkoutId] = React.useState(
    addToWorkoutId?.trim() ?? "",
  );

  const loadWorkouts = React.useCallback(async () => {
    const listResult = await listMemberPersonalWorkoutsAction();
    if (!listResult.ok) return;
    const rows = listResult.data ?? [];
    setWorkouts(rows);
    setPickWorkoutId((current) => {
      const preferred =
        addToWorkoutId?.trim() || current.trim() || rows[0]?.id || "";
      if (preferred && rows.some((w) => w.id === preferred)) return preferred;
      return rows[0]?.id ?? "";
    });
  }, [addToWorkoutId]);

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
        const rows = listResult.data;
        setWorkouts(rows);
        const preferred = addToWorkoutId?.trim() || rows[0]?.id || "";
        if (preferred) setPickWorkoutId(preferred);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [catalogId, addToWorkoutId]);

  React.useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") void loadWorkouts();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadWorkouts]);

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
      toast.success("Added to your workout.");
      router.push(`/member/workout/personal/${workoutId}`);
    } finally {
      setAdding(false);
    }
  }

  const libraryBackHref = memberWorkoutPageHref({
    tab: "library",
    addTo: addToWorkoutId,
    group: libraryGroup,
  });

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
      className="relative pb-[calc(11.5rem+4.25rem+env(safe-area-inset-bottom,0px))]"
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
          "fixed inset-x-0 z-30 border-t border-border/80 bg-card/95 p-4 backdrop-blur-md",
          "bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))]",
        )}
      >
        <div className="mx-auto max-w-2xl space-y-2">
          {workouts.length === 0 ? (
            <>
              <p className="text-center text-sm text-muted-foreground">
                Create a workout first, then add this exercise.
              </p>
              <Button type="button" className="h-12 w-full text-base" asChild>
                <Link href={memberWorkoutPageHref({ tab: "mine" })}>
                  Create workout
                </Link>
              </Button>
            </>
          ) : (
            <>
              <select
                className="flex h-11 w-full rounded-xl border border-border bg-background px-3 text-base"
                value={pickWorkoutId}
                onChange={(e) => setPickWorkoutId(e.target.value)}
              >
                {workouts.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                    {w.exerciseCount > 0
                      ? ` (${w.exerciseCount} ex.)`
                      : ""}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                className="h-12 w-full text-base font-semibold"
                disabled={adding || !pickWorkoutId}
                onClick={() => void onAdd()}
              >
                {adding ? "Adding…" : "Add to workout"}
              </Button>
            </>
          )}
          <Button
            type="button"
            variant="ghost"
            className="h-10 w-full text-muted-foreground"
            asChild
          >
            <Link href={libraryBackHref}>Back to library</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
