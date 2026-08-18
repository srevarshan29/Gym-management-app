"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { startWorkoutSession } from "@/app/actions/workout-sessions";
import { MemberWorkoutPlanView } from "@/components/member-portal/member-workout-plan-view";
import { WorkoutSessionView } from "@/components/member-portal/workout/workout-session-view";
import { Button } from "@/components/ui/button";
import { useActionLock } from "@/hooks/use-action-lock";
import type { PreviousSetLog } from "@/lib/workout-tracking/previous-sets";
import type { ActiveWorkoutSession } from "@/lib/workout-tracking/sessions";
import type { WorkoutPlanDetail } from "@/lib/workout-tracking/types";

type MemberWorkoutPageClientProps = {
  plan: WorkoutPlanDetail | null;
  activeSession: ActiveWorkoutSession | null;
  previousSets: Record<string, PreviousSetLog[]>;
  canStart: boolean;
};

export function MemberWorkoutPageClient({
  plan,
  activeSession,
  previousSets,
  canStart,
}: MemberWorkoutPageClientProps) {
  const router = useRouter();
  const { run, isPending: pending } = useActionLock();

  async function onStart(dayId?: string) {
    if (pending) return;
    await run(async () => {
      try {
        const result = await startWorkoutSession(dayId);
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
      }
    });
  }

  if (!plan || plan.isLegacy) {
    return <MemberWorkoutPlanView plan={plan} />;
  }

  if (activeSession) {
    return (
      <WorkoutSessionView
        session={activeSession}
        previousSets={previousSets}
      />
    );
  }

  const startableDays = plan.days.filter((day) => day.exercises.length > 0);
  const showDayPicker = startableDays.length > 1;

  return (
    <div className="space-y-4">
      <MemberWorkoutPlanView plan={plan} />
      {canStart && !showDayPicker ? (
        <Button
          className="w-full"
          onClick={() => onStart(startableDays[0]?.id)}
          disabled={pending}
        >
          {pending ? "Starting..." : "Start workout"}
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
              disabled={pending}
            >
              {pending ? "Starting..." : `Start ${day.label}`}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
