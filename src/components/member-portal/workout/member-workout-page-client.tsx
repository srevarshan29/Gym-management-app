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

function toIsoTimestamp(value: string | Date): string {
  return typeof value === "string" ? value : value.toISOString();
}

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
  const [setValues, setSetValues] = React.useState<Record<string, string>>({});
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    setActiveSession(initialSession);
  }, [initialSession]);

  async function onStart() {
    setPending(true);
    try {
      const result = await startWorkoutSession();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Workout started.");
      router.refresh();
    } catch (error) {
      console.error("[workout] startWorkoutSession failed:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not start workout. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  async function onLogSet(
    sessionExerciseId: string,
    setNumber: number,
    trackingType: ActiveWorkoutSession["exercises"][number]["trackingType"],
  ) {
    const key = `${sessionExerciseId}-${setNumber}`;
    const rawValue = setValues[key];

    const payload: {
      sessionExerciseId: string;
      setNumber: number;
      weightKg?: number;
      durationSeconds?: number;
    } = { sessionExerciseId, setNumber };

    if (trackingType === "WEIGHTED") {
      const weightKg = Number(rawValue);
      if (!rawValue && weightKg !== 0) {
        toast.error("Enter a weight for this set.");
        return;
      }
      payload.weightKg = weightKg;
    } else if (trackingType === "TIME") {
      const durationSeconds = Number(rawValue);
      if (!durationSeconds || durationSeconds < 1) {
        toast.error("Enter a duration in seconds for this set.");
        return;
      }
      payload.durationSeconds = durationSeconds;
    }

    try {
      const result = await logWorkoutSet(payload);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Set saved.");
      router.refresh();
    } catch (error) {
      console.error("[workout] logWorkoutSet failed:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not save set. Please try again.",
      );
    }
  }

  async function onComplete() {
    if (!activeSession) return;
    setPending(true);
    try {
      const result = await completeWorkoutSession(activeSession.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Workout completed.");
      router.refresh();
    } catch (error) {
      console.error("[workout] completeWorkoutSession failed:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not complete workout. Please try again.",
      );
    } finally {
      setPending(false);
    }
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
      <SessionTimer startedAt={toIsoTimestamp(activeSession.startedAt)} />

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
              const isTime = exercise.trackingType === "TIME";
              const isBodyweight = exercise.trackingType === "BODYWEIGHT";
              const loggedDisplay =
                logged != null
                  ? isTime
                    ? logged.durationSeconds != null
                      ? String(logged.durationSeconds)
                      : ""
                    : logged.weightKg != null
                      ? String(logged.weightKg)
                      : ""
                  : "";
              const value = setValues[key] ?? loggedDisplay;
              const isLogged = logged != null;

              if (isBodyweight) {
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/20 p-3"
                  >
                    <span className="text-sm font-medium">Set {setNumber}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant={isLogged ? "secondary" : "default"}
                      onClick={() =>
                        onLogSet(exercise.id, setNumber, exercise.trackingType)
                      }
                    >
                      {isLogged ? "Saved" : "Mark done"}
                    </Button>
                  </div>
                );
              }

              return (
                <div
                  key={key}
                  className="flex items-end gap-2 rounded-lg border border-border bg-muted/20 p-3"
                >
                  <div className="flex-1 space-y-1">
                    <Label htmlFor={key}>
                      Set {setNumber} ({isTime ? "seconds" : "kg"})
                    </Label>
                    <Input
                      id={key}
                      type="number"
                      min={isTime ? 1 : 0}
                      step={isTime ? 1 : 0.5}
                      value={value}
                      onChange={(e) =>
                        setSetValues((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      onLogSet(exercise.id, setNumber, exercise.trackingType)
                    }
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
