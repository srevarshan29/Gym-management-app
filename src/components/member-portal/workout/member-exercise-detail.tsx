"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { getMemberExerciseLibraryDetailAction } from "@/app/actions/member-exercise-library";
import { addExerciseToPersonalWorkoutAction } from "@/app/actions/member-personal-workouts";
import { listMemberPersonalWorkoutsAction } from "@/app/actions/member-personal-workouts";
import { MemberExerciseWatchDemoLink } from "@/components/member-portal/workout/member-exercise-watch-demo-link";
import { Button } from "@/components/ui/button";
import type { MemberCatalogExerciseDetail } from "@/lib/workout-tracking/member-catalog-exercises";
import type { MemberPersonalWorkoutSummary } from "@/lib/workout-tracking/member-personal-workouts";

type MemberExerciseDetailProps = {
  catalogId: string;
  addToWorkoutId?: string | null;
};

export function MemberExerciseDetail({
  catalogId,
  addToWorkoutId,
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
        setWorkouts(listResult.data);
        if (!pickWorkoutId && listResult.data[0]) {
          setPickWorkoutId(listResult.data[0].id);
        }
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [catalogId, addToWorkoutId]);

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

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
    <div className="space-y-4 pb-8">
      {imageUrl ? (
        <div className="mx-auto aspect-[4/3] w-full max-w-md overflow-hidden rounded-xl bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={detail.name}
            className="h-full w-full object-contain"
          />
        </div>
      ) : null}

      <div>
        <h1 className="font-display text-xl font-bold">{detail.name}</h1>
        <p className="text-sm text-muted-foreground">
          {detail.muscleGroup}
          {detail.equipment ? ` · ${detail.equipment}` : ""}
        </p>
      </div>

      {detail.youtubeUrl ? (
        <MemberExerciseWatchDemoLink youtubeUrl={detail.youtubeUrl} />
      ) : null}

      {detail.description ? (
        <p className="text-sm leading-relaxed">{detail.description}</p>
      ) : null}

      {detail.instructions.length > 0 ? (
        <div>
          <h2 className="mb-2 text-sm font-semibold">Instructions</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            {detail.instructions.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      ) : null}

      <div className="rounded-xl border p-3 space-y-3">
        <p className="text-sm font-medium">Add to personal workout</p>
        {workouts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Create a workout under My Workouts first.
          </p>
        ) : (
          <>
            <select
              className="flex h-11 w-full rounded-md border bg-background px-3 text-base"
              value={pickWorkoutId}
              onChange={(e) => setPickWorkoutId(e.target.value)}
            >
              {workouts.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            <Button
              type="button"
              className="h-12 w-full text-base"
              disabled={adding || !pickWorkoutId}
              onClick={() => void onAdd()}
            >
              {adding ? "Adding…" : "Add exercise"}
            </Button>
          </>
        )}
        <Button type="button" variant="outline" className="h-11 w-full" asChild>
          <Link href="/member/workout?tab=library">Back to library</Link>
        </Button>
      </div>
    </div>
  );
}
