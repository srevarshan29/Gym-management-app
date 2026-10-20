"use client";

import { MemberWorkoutPlanView } from "@/components/member-portal/member-workout-plan-view";
import { MemberMyWorkoutsPanel } from "@/components/member-portal/workout/member-my-workouts-panel";
import { Button } from "@/components/ui/button";
import type { MemberPlanFilter } from "@/lib/member-portal/member-workout-tab-url";
import type { WorkoutPlanDetail } from "@/lib/workout-tracking/types";
import { cn } from "@/lib/utils";

const PLAN_FILTERS: { id: MemberPlanFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "trainer", label: "Trainer" },
  { id: "mine", label: "Mine" },
];

type MemberWorkoutPlanPanelProps = {
  planFilter: MemberPlanFilter;
  onPlanFilterChange: (filter: MemberPlanFilter) => void;
  plan: WorkoutPlanDetail | null;
  canStart: boolean;
  startingDayKey: string | null;
  onStartTrainer: (dayId?: string) => void;
  highlightWorkoutId?: string | null;
  onHighlightConsumed?: () => void;
  onOpenExercisesTab?: () => void;
};

export function MemberWorkoutPlanPanel({
  planFilter,
  onPlanFilterChange,
  plan,
  canStart,
  startingDayKey,
  onStartTrainer,
  highlightWorkoutId = null,
  onHighlightConsumed,
  onOpenExercisesTab,
}: MemberWorkoutPlanPanelProps) {
  const showTrainer = planFilter === "all" || planFilter === "trainer";
  const showMine = planFilter === "all" || planFilter === "mine";

  const startableDays =
    plan?.days.filter((day) => day.exercises.length > 0) ?? [];
  const showDayPicker = startableDays.length > 1;

  return (
    <div className="space-y-4">
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Plan filters"
      >
        {PLAN_FILTERS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            className={cn(
              "min-h-9 rounded-full border px-3.5 text-sm font-semibold transition-colors",
              planFilter === chip.id
                ? "border-primary bg-primary/15 text-primary"
                : "border-border/60 bg-card/50 text-muted-foreground hover:text-foreground",
            )}
            aria-pressed={planFilter === chip.id}
            onClick={() => onPlanFilterChange(chip.id)}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {showTrainer ? (
        <section className="space-y-3" aria-label="Trainer plan">
          {planFilter === "all" ? (
            <h2 className="font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Trainer
            </h2>
          ) : null}
          <MemberWorkoutPlanView plan={plan} />
          {canStart && !showDayPicker ? (
            <Button
              className="w-full"
              onClick={() => onStartTrainer(startableDays[0]?.id)}
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
                  onClick={() => onStartTrainer(day.id)}
                  disabled={startingDayKey !== null}
                >
                  {startingDayKey === day.id
                    ? "Starting..."
                    : `Start ${day.label}`}
                </Button>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {showMine ? (
        <section
          className={cn(showTrainer && "border-t border-border/40 pt-4")}
          aria-label="My workouts"
        >
          {planFilter === "all" ? (
            <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">
              My workouts
            </h2>
          ) : null}
          <MemberMyWorkoutsPanel
            highlightWorkoutId={highlightWorkoutId}
            onHighlightConsumed={onHighlightConsumed}
            onOpenExercisesTab={onOpenExercisesTab}
            showIntro={planFilter === "mine"}
          />
        </section>
      ) : null}
    </div>
  );
}
