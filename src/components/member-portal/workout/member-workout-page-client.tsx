"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

import {
  completeWorkoutSession,
  logWorkoutSet,
  startWorkoutSession,
} from "@/app/actions/workout-sessions";
import { MemberWorkoutPlanView } from "@/components/member-portal/member-workout-plan-view";
import { RestTimer } from "@/components/member-portal/workout/rest-timer";
import { SessionTimer } from "@/components/member-portal/workout/session-timer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActiveWorkoutSession } from "@/lib/workout-tracking/sessions";
import type { WorkoutPlanDetail } from "@/lib/workout-tracking/types";

type MemberWorkoutPageClientProps = {
  plan: WorkoutPlanDetail | null;
  activeSession: ActiveWorkoutSession | null;
  canStart: boolean;
};

export function MemberWorkoutPageClient({
  plan,
  activeSession: initialSession,
  canStart,
}: MemberWorkoutPageClientProps) {
  const router = useRouter();
  const [activeSession, setActiveSession] = React.useState(initialSession);
  const [weights, setWeights] = React.useState<Record<string, string>>({});
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    setActiveSession(initialSession);
  }, [initialSession]);

  async function onStart() {
    setPending(true);
    const result = await startWorkoutSession();
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(result.message ?? "Workout started.");
    router.refresh();
  }

  async function onLogSet(sessionExerciseId: string, setNumber: number) {
    const key = `${sessionExerciseId}-${setNumber}`;
    const weightKg = Number(weights[key]);
    if (!weightKg && weightKg !== 0) {
      toast.error("Enter a weight for this set.");
      return;
    }
    const result = await logWorkoutSet({ sessionExerciseId, setNumber, weightKg });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Set saved.");
    router.refresh();
  }

  async function onComplete() {
    if (!activeSession) return;
    setPending(true);
    const result = await completeWorkoutSession(activeSession.id);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(result.message ?? "Workout completed.");
    router.refresh();
  }

  if (!plan || plan.isLegacy) {
    return <MemberWorkoutPlanView plan={plan} />;
  }

  if (!activeSession) {
    return (
      <div className="space-y-4">
        <MemberWorkoutPlanView plan={plan} />
        {canStart ? (
          <Button className="w-full" onClick={onStart} disabled={pending}>
            {pending ? "Starting..." : "Start workout"}
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SessionTimer startedAt={activeSession.startedAt.toISOString()} />

      {activeSession.exercises.map((exercise) => (
        <Card key={exercise.id}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{exercise.displayName}</CardTitle>
            <p className="text-sm text-muted-foreground">
              Target: {exercise.targetSets} × {exercise.targetReps}
              {exercise.targetWeightKg != null
                ? ` · ${exercise.targetWeightKg} kg`
                : ""}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: exercise.targetSets }, (_, index) => {
              const setNumber = index + 1;
              const key = `${exercise.id}-${setNumber}`;
              const logged = exercise.sets.find((s) => s.setNumber === setNumber);
              const value =
                weights[key] ??
                (logged != null ? String(logged.weightKg) : "");
              return (
                <div
                  key={key}
                  className="flex items-end gap-2 rounded-lg border border-border bg-muted/20 p-3"
                >
                  <div className="flex-1 space-y-1">
                    <Label htmlFor={key}>Set {setNumber} (kg)</Label>
                    <Input
                      id={key}
                      type="number"
                      min={0}
                      step={0.5}
                      value={value}
                      onChange={(e) =>
                        setWeights((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onLogSet(exercise.id, setNumber)}
                  >
                    Save
                  </Button>
                </div>
              );
            })}
            <RestTimer defaultSeconds={exercise.restSeconds} />
          </CardContent>
        </Card>
      ))}

      <Button
        className="w-full gap-2"
        onClick={onComplete}
        disabled={pending}
      >
        <CheckCircle2 className="h-4 w-4" />
        {pending ? "Finishing..." : "Complete workout"}
      </Button>
    </div>
  );
}
