import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ExerciseMedia } from "@/components/exercise-media";
import type { WorkoutPlanDetail } from "@/lib/workout-tracking/types";
import { MemberExerciseWatchDemoLink } from "@/components/member-portal/workout/member-exercise-watch-demo-link";

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

      {plan.days.map((day) => (
        <Card key={day.id}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-primary">
              {day.label}
            </CardTitle>
            <CardDescription>
              {day.exercises.length} exercise
              {day.exercises.length === 1 ? "" : "s"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {day.exercises.map((exercise) => (
              <div
                key={exercise.id}
                className="rounded-xl border border-border bg-muted/20 p-4"
              >
                <div className="flex gap-3">
                  {exercise.exerciseId ? (
                    <ExerciseMedia
                      media={exercise.media}
                      alt={`${exercise.displayName} demonstration`}
                      variant="thumbnail"
                      compact
                      emptyLabel=""
                      className="h-[4.5rem] w-[4.5rem] shrink-0 sm:h-20 sm:w-20"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1 space-y-2">
                    <div>
                      <p className="break-words font-medium">{exercise.displayName}</p>
                      {exercise.muscleGroup ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {exercise.muscleGroup}
                        </p>
                      ) : null}
                    </div>
                    {exercise.youtubeUrl ? (
                      <MemberExerciseWatchDemoLink
                        youtubeUrl={exercise.youtubeUrl}
                        compact
                      />
                    ) : null}
                    <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                  <span>
                    {exercise.targetSets} sets × {exercise.targetReps} reps
                  </span>
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
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
