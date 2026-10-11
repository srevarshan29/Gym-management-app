"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { startWorkoutSession } from "@/app/actions/workout-sessions";
import { MemberExerciseLibraryPanel } from "@/components/member-portal/workout/member-exercise-library-panel";
import { MemberWorkoutPlanPanel } from "@/components/member-portal/workout/member-workout-plan-panel";
import {
  MemberWorkoutTabs,
  type MemberWorkoutTab,
} from "@/components/member-portal/workout/member-workout-tabs";
import { WorkoutSessionView } from "@/components/member-portal/workout/workout-session-view";
import { parseMemberLibraryMuscleGroup } from "@/lib/member-portal/member-library-muscle-groups";
import {
  memberPersonalWorkoutEditorHref,
  memberWorkoutPageHref,
  parseMemberPlanFilter,
  parseMemberWorkoutTab,
  type MemberPlanFilter,
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
  initialTab?: string | null;
  addToWorkoutId?: string | null;
  createdWorkoutId?: string | null;
};

export function MemberWorkoutPageClient({
  plan,
  activeSession,
  previousSets,
  canStart,
  initialTab = null,
  addToWorkoutId = null,
  createdWorkoutId = null,
}: MemberWorkoutPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resolvedAddTo =
    searchParams.get("addTo")?.trim() || addToWorkoutId?.trim() || null;
  const rawTabParam = searchParams.get("tab") ?? initialTab;
  const urlTopTab = resolvedAddTo
    ? "exercises"
    : parseMemberWorkoutTab(rawTabParam);
  const urlPlanFilter = parseMemberPlanFilter(
    rawTabParam,
    searchParams.get("planFilter"),
  );

  const [tab, setTab] = React.useState<MemberWorkoutTab>(urlTopTab);
  const [planFilter, setPlanFilter] =
    React.useState<MemberPlanFilter>(urlPlanFilter);
  const [, startTransition] = React.useTransition();
  const [startingDayKey, setStartingDayKey] = React.useState<string | null>(
    null,
  );

  const resolvedCreated =
    searchParams.get("created")?.trim() || createdWorkoutId?.trim() || null;
  const resolvedGroup = parseMemberLibraryMuscleGroup(
    searchParams.get("group"),
  );

  React.useEffect(() => {
    setTab(urlTopTab);
    setPlanFilter(urlPlanFilter);
  }, [urlTopTab, urlPlanFilter]);

  React.useEffect(() => {
    const addTo = resolvedAddTo;
    if (!addTo) return;
    const tabParam = searchParams.get("tab") ?? initialTab;
    if (parseMemberWorkoutTab(tabParam) === "exercises") return;
    router.replace(
      memberWorkoutPageHref({
        tab: "library",
        addTo,
        group: parseMemberLibraryMuscleGroup(searchParams.get("group")),
      }),
      { scroll: false },
    );
  }, [resolvedAddTo, searchParams, initialTab, router]);

  React.useEffect(() => {
    if (activeSession) {
      setStartingDayKey(null);
    }
  }, [activeSession]);

  function navigateTopTab(next: MemberWorkoutTab) {
    setTab(next);
    router.replace(
      memberWorkoutPageHref({
        tab: next === "exercises" ? "library" : "plan",
        planFilter: next === "plan" ? planFilter : null,
        addTo: next === "exercises" ? resolvedAddTo : null,
        created: next === "plan" ? resolvedCreated : null,
        group: next === "exercises" ? resolvedGroup : null,
      }),
      { scroll: false },
    );
  }

  function navigatePlanFilter(next: MemberPlanFilter) {
    setPlanFilter(next);
    router.replace(
      memberWorkoutPageHref({
        tab: "plan",
        planFilter: next,
        created: next === "mine" ? resolvedCreated : null,
      }),
      { scroll: false },
    );
  }

  async function onStartTrainer(dayId?: string) {
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

  return (
    <MemberWorkoutTheme className="!p-0 sm:!p-0">
      <MemberWorkoutTabs value={tab} onChange={(next) => navigateTopTab(next)} />

      {tab === "exercises" ? (
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

      {tab === "plan" ? (
        <MemberWorkoutPlanPanel
          planFilter={planFilter}
          onPlanFilterChange={navigatePlanFilter}
          plan={plan}
          canStart={canStart}
          startingDayKey={startingDayKey}
          onStartTrainer={(dayId) => void onStartTrainer(dayId)}
          highlightWorkoutId={resolvedCreated}
          onHighlightConsumed={() => {
            router.replace(
              memberWorkoutPageHref({ tab: "mine" }),
              { scroll: false },
            );
          }}
        />
      ) : null}
    </MemberWorkoutTheme>
  );
}
