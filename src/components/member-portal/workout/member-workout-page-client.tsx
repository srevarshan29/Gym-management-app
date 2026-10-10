"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { parseMemberLibraryMuscleGroup } from "@/lib/member-portal/member-library-muscle-groups";
import {
  memberPersonalWorkoutEditorHref,
  memberWorkoutPageHref,
  parseMemberWorkoutTab,
} from "@/lib/member-portal/member-workout-tab-url";
import { MemberWorkoutTheme } from "@/components/member-portal/workout/member-workout-theme";
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
  createdWorkoutId?: string | null;
};

export function MemberWorkoutPageClient({
  plan,
  activeSession,
  previousSets,
  canStart,
  initialTab = "assigned",
  addToWorkoutId = null,
  createdWorkoutId = null,
}: MemberWorkoutPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTab = parseMemberWorkoutTab(
    searchParams.get("tab") ?? (initialTab !== "assigned" ? initialTab : null),
  );
  const [tab, setTab] = React.useState<MemberWorkoutTab>(urlTab);
  const [, startTransition] = React.useTransition();
  const [startingDayKey, setStartingDayKey] = React.useState<string | null>(
    null,
  );

  const resolvedAddTo =
    searchParams.get("addTo")?.trim() || addToWorkoutId?.trim() || null;
  const resolvedCreated =
    searchParams.get("created")?.trim() || createdWorkoutId?.trim() || null;
  const resolvedGroup = parseMemberLibraryMuscleGroup(
    searchParams.get("group"),
  );

  React.useEffect(() => {
    setTab(urlTab);
  }, [urlTab]);

  React.useEffect(() => {
    if (activeSession) {
      setStartingDayKey(null);
    }
  }, [activeSession]);

  function navigateTab(
    next: MemberWorkoutTab,
    extra?: { created?: string; group?: typeof resolvedGroup },
  ) {
    setTab(next);
    router.replace(
      memberWorkoutPageHref({
        tab: next,
        addTo: next === "library" ? resolvedAddTo : null,
        created: extra?.created ?? (next === "mine" ? resolvedCreated : null),
        group:
          extra?.group !== undefined
            ? extra.group
            : next === "library"
              ? resolvedGroup
              : null,
      }),
      { scroll: false },
    );
  }

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
    <MemberWorkoutTheme className="!p-0 sm:!p-0">
      <MemberWorkoutTabs value={tab} onChange={(next) => navigateTab(next)} />

      {tab === "library" ? (
        <MemberExerciseLibraryPanel
          addToWorkoutId={resolvedAddTo}
          initialGroup={resolvedGroup}
          selectionMode={Boolean(resolvedAddTo)}
          doneHref={
            resolvedAddTo
              ? memberPersonalWorkoutEditorHref(resolvedAddTo)
              : null
          }
        />
      ) : null}

      {tab === "mine" ? (
        <MemberMyWorkoutsPanel
          highlightWorkoutId={resolvedCreated}
          onHighlightConsumed={() => {
            router.replace(memberWorkoutPageHref({ tab: "mine" }), {
              scroll: false,
            });
          }}
        />
      ) : null}

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
    </MemberWorkoutTheme>
  );
}
