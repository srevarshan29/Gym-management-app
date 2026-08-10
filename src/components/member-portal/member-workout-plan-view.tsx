import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { WorkoutPlanDetail } from "@/lib/workout-tracking/types";

type MemberWorkoutPlanViewProps = {
  plan: WorkoutPlanDetail | null;
};

export function MemberWorkoutPlanView({ plan }: MemberWorkoutPlanViewProps) {
  if (!plan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">No workout plan assigned</CardTitle>
          <CardDescription>
            Your trainer can assign a structured workout plan from the staff app.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (plan.isLegacy) {
    return (
      <div className="space-y-4">
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-base">{plan.title}</CardTitle>
            <CardDescription>
              Legacy plan — your trainer is updating this to the new structured format.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap rounded-lg border bg-muted/30 p-4 text-sm">
              {plan.weeklySchedule}
            </pre>
          </CardContent>
        </Card>
      </div>
    );
  }

  const grouped = plan.exercises.reduce<Record<string, typeof plan.exercises>>(
    (acc, exercise) => {
      const key = exercise.muscleGroup ?? "Custom";
      if (!acc[key]) acc[key] = [];
      acc[key]!.push(exercise);
      return acc;
    },
    {},
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{plan.title}</CardTitle>
          <CardDescription>
            {plan.durationWeeks ? `${plan.durationWeeks} week programme` : "Ongoing programme"}
            {plan.focusGoal ? ` · ${plan.focusGoal}` : ""}
          </CardDescription>
        </CardHeader>
      </Card>

      {Object.keys(grouped)
        .sort()
        .map((group) => (
          <Card key={group}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-primary">
                {group}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {grouped[group]!.map((exercise) => (
                <div
                  key={exercise.id}
                  className="rounded-xl border border-border bg-muted/20 p-4"
                >
                  <p className="font-medium">{exercise.displayName}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <span>{exercise.targetSets} sets × {exercise.targetReps} reps</span>
                    {exercise.targetWeightKg != null ? (
                      <span>Target: {exercise.targetWeightKg} kg</span>
                    ) : (
                      <span>Target weight: —</span>
                    )}
                    {exercise.tempo ? <span>Tempo: {exercise.tempo}</span> : null}
                    {exercise.restSeconds != null ? (
                      <span>Rest: {exercise.restSeconds}s</span>
                    ) : null}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
    </div>
  );
}
