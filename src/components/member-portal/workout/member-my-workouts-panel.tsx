"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import {
  createMemberPersonalWorkoutAction,
  listMemberPersonalWorkoutsAction,
  startPersonalWorkoutSessionAction,
} from "@/app/actions/member-personal-workouts";
import { MemberWorkoutFlowSteps } from "@/components/member-portal/workout/member-workout-flow-steps";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  memberPersonalWorkoutAddExercisesHref,
  memberWorkoutPageHref,
} from "@/lib/member-portal/member-workout-tab-url";
import type { MemberPersonalWorkoutSummary } from "@/lib/workout-tracking/member-personal-workouts";
import { cn } from "@/lib/utils";

type MemberMyWorkoutsPanelProps = {
  highlightWorkoutId?: string | null;
  onHighlightConsumed?: () => void;
};

export function MemberMyWorkoutsPanel({
  highlightWorkoutId = null,
  onHighlightConsumed,
}: MemberMyWorkoutsPanelProps) {
  const router = useRouter();
  const [workouts, setWorkouts] = React.useState<MemberPersonalWorkoutSummary[]>(
    [],
  );
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [startingId, setStartingId] = React.useState<string | null>(null);
  const [recentlyCreatedId, setRecentlyCreatedId] = React.useState<
    string | null
  >(null);

  const loadWorkouts = React.useCallback(async () => {
    const result = await listMemberPersonalWorkoutsAction();
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    setWorkouts(result.data ?? []);
    return true;
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    void loadWorkouts().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [loadWorkouts]);

  React.useEffect(() => {
    const highlight = highlightWorkoutId?.trim();
    if (!highlight) return;
    setRecentlyCreatedId(highlight);
    void loadWorkouts();
    onHighlightConsumed?.();
  }, [highlightWorkoutId, loadWorkouts]);

  React.useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") {
        void loadWorkouts();
      }
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadWorkouts]);

  async function onCreate() {
    const name = newName.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const result = await createMemberPersonalWorkoutAction({ name });
      if (!result.ok || !result.data) {
        toast.error(!result.ok ? result.error : "Could not create workout.");
        return;
      }
      const workoutId = result.data.workoutId;
      setNewName("");
      setRecentlyCreatedId(workoutId);
      await loadWorkouts();
      toast.success("Workout created. Add exercises from the Library tab.");
      router.replace(
        memberWorkoutPageHref({ tab: "mine", created: workoutId }),
        { scroll: false },
      );
    } finally {
      setCreating(false);
    }
  }

  async function onStart(workoutId: string) {
    if (startingId) return;
    setStartingId(workoutId);
    try {
      const result = await startPersonalWorkoutSessionAction(workoutId);
      if (!result.ok) {
        toast.error(!result.ok ? result.error : "Could not start workout.");
        return;
      }
      toast.success(result.message);
      router.replace(memberWorkoutPageHref({ tab: "mine" }), { scroll: false });
      router.refresh();
    } finally {
      setStartingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <MemberWorkoutFlowSteps />
      <p className="text-sm text-muted-foreground">
        Build your own plans here. Open the{" "}
        <button
          type="button"
          className="font-medium text-foreground underline"
          onClick={() =>
            router.replace(memberWorkoutPageHref({ tab: "library" }), {
              scroll: false,
            })
          }
        >
          Library
        </button>{" "}
        tab to add exercises, or edit a workout below.
      </p>

      <div className="member-workout-card space-y-2 p-3">
        <p className="text-sm font-medium">New workout</p>
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Workout name"
            className="h-11 text-base"
            maxLength={80}
            onKeyDown={(e) => {
              if (e.key === "Enter") void onCreate();
            }}
          />
          <Button
            type="button"
            className="h-11 shrink-0 px-3"
            onClick={() => void onCreate()}
            disabled={creating || !newName.trim()}
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {workouts.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-6">
          Create a workout above, then add exercises from the Library tab.
        </p>
      ) : (
        <ul className="space-y-3">
          {workouts.map((w) => {
            const highlighted =
              w.id === recentlyCreatedId || w.id === highlightWorkoutId?.trim();
            return (
              <li
                key={w.id}
                className={cn(
                  "member-workout-card space-y-2 p-3",
                  highlighted && "border-primary/40 member-workout-glow",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      href={`/member/workout/personal/${w.id}`}
                      className="font-medium hover:underline"
                    >
                      {w.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {w.exerciseCount} exercise
                      {w.exerciseCount === 1 ? "" : "s"}
                    </p>
                    {highlighted ? (
                      <p className="mt-1 text-xs text-primary">
                        Ready — add exercises from Library or open Edit.
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-11 flex-1"
                    asChild
                  >
                    <Link
                      href={memberPersonalWorkoutAddExercisesHref(w.id)}
                    >
                      Add exercise
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    className="h-11 flex-1"
                    disabled={w.exerciseCount === 0 || startingId !== null}
                    onClick={() => void onStart(w.id)}
                  >
                    {startingId === w.id ? "Starting…" : "Start"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 flex-1"
                    asChild
                  >
                    <Link href={`/member/workout/personal/${w.id}`}>Edit</Link>
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
