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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MemberPersonalWorkoutSummary } from "@/lib/workout-tracking/member-personal-workouts";

export function MemberMyWorkoutsPanel() {
  const router = useRouter();
  const [workouts, setWorkouts] = React.useState<MemberPersonalWorkoutSummary[]>(
    [],
  );
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [startingId, setStartingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void listMemberPersonalWorkoutsAction().then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        toast.error(!result.ok ? result.error : "Could not create workout.");
        setLoading(false);
        return;
      }
      setWorkouts(result.data ?? []);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
      setNewName("");
      router.push(`/member/workout/personal/${result.data.workoutId}`);
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
        toast.error(!result.ok ? result.error : "Could not create workout.");
        return;
      }
      toast.success(result.message);
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
      <div className="rounded-xl border p-3 space-y-2">
        <p className="text-sm font-medium">New workout</p>
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Workout name"
            className="h-11 text-base"
            maxLength={80}
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
          Create a workout, then add exercises from the library.
        </p>
      ) : (
        <ul className="divide-y divide-border/70 rounded-xl border">
          {workouts.map((w) => (
            <li key={w.id} className="p-3 space-y-2">
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
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  className="h-11 flex-1"
                  disabled={
                    w.exerciseCount === 0 || startingId !== null
                  }
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
          ))}
        </ul>
      )}
    </div>
  );
}
