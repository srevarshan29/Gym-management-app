"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { startWorkoutSession } from "@/app/actions/workout-sessions";
import { MemberWorkoutPlanView } from "@/components/member-portal/member-workout-plan-view";
import { MemberExerciseLibraryPanel } from "@/components/member-portal/workout/member-exercise-library-panel";
import { MemberMyWorkoutsPanel } from "@/components/member-portal/workout/member-my-workouts-panel";
import {
  MemberWorkoutTabs,
  type MemberWorkoutTab,
} from "@/components/member-portal/workout/member-workout-tabs";
import { WorkoutSessionView } from "@/components/member-portal/workout/workout-session-view";
import { Button } from "@/components/ui/button";
import type {
  ActiveWorkoutSession,
  PreviousSetLog,
  WorkoutPlanDetail,
} from "@/lib/workout-tracking/types";

type MemberWorkoutPageClientProps = {
  plan: WorkoutPlanDetail | null;
  activeSession: ActiveWorkoutSession | null;
  previousSets: Record<string, PreviousSetLog[]>;
  canStart: boolean;
  initialTab?: MemberWorkoutTab;
  addToWorkoutId?: string | null;
};

export function MemberWorkoutPageClient({
  plan,
  activeSession,
  previousSets,
  canStart,
  initialTab = "assigned",
  addToWorkoutId = null,
}: MemberWorkoutPageClientProps) {
  const router = useRouter();
  const [tab, setTab] = React.useState<MemberWorkoutTab>(initialTab);
  const [, startTransition] = React.useTransition();
  const [startingDayKey, setStartingDayKey] = React.useState<string | null>(
    null,
  );

  React.useEffect(() => {
    if (activeSession) {
      setStartingDayKey(null);
    }
  }, [activeSession]);

  async function onStart(dayId?: string) {
    const dayKey = dayId ?? "__default__";
    if (startingDayKey !== null) return;
    setStartingDayKey(dayKey);
    try {
      const result = await startWorkoutSession(dayId);
      if (!result.ok) {
        toast.error(result.error);
        setStartingDayKey(null);
        return;
      }
      toast.success(result.message ?? "Workout started.");
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      console.error("[workout] startWorkoutSession failed:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not start workout. Please try again.",
      );
      setStartingDayKey(null);
    }
  }

  if (activeSession) {
    return (
      <WorkoutSessionView
        session={activeSession}
        previousSets={previousSets}
      />
    );
  }

  const startableDays =
    plan?.days.filter((day) => day.exercises.length > 0) ?? [];
  const showDayPicker = startableDays.length > 1;

  return (
    <div className="space-y-4">
      <MemberWorkoutTabs
        value={tab}
        onChange={(next) => {
          setTab(next);
          router.replace(
            next === "assigned"
              ? "/member/workout"
              : `/member/workout?tab=${next}`,
            { scroll: false },
          );
        }}
      />

      {tab === "library" ? (
        <MemberExerciseLibraryPanel addToWorkoutId={addToWorkoutId} />
      ) : null}

      {tab === "mine" ? <MemberMyWorkoutsPanel /> : null}

      {tab === "assigned" ? (
        <>
          <MemberWorkoutPlanView plan={plan} />
      {canStart && !showDayPicker ? (
        <Button
          className="w-full"
          onClick={() => onStart(startableDays[0]?.id)}
          disabled={startingDayKey !== null}
        >
          {startingDayKey === (startableDays[0]?.id ?? "__default__")
            ? "Starting..."
            : "Start workout"}
        </Button>
      ) : null}
      {canStart && showDayPicker ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Choose which day to train.
          </p>
          {startableDays.map((day) => (
            <Button
              key={day.id}
              className="w-full"
              variant="outline"
              onClick={() => onStart(day.id)}
              disabled={startingDayKey !== null}
            >
              {startingDayKey === day.id
                ? "Starting..."
                : `Start ${day.label}`}
            </Button>
          ))}
        </div>
      ) : null}
        </>
      ) : null}
    </div>
  );
}
