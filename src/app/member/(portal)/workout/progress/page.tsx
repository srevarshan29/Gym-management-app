import { Suspense } from "react";
import Link from "next/link";

import { requireMember } from "@/lib/member-session";
import { getMemberExerciseOptions, getExerciseProgressData } from "@/lib/workout-tracking/progress";
import { ExerciseProgressPanel } from "@/components/workout/exercise-progress-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function MemberWorkoutProgressPage({
  searchParams,
}: {
  searchParams: { exercise?: string; grouping?: string };
}) {
  const session = await requireMember();
  const exercises = await getMemberExerciseOptions(
    session.gymId,
    session.memberId,
  );

  const exerciseKey =
    searchParams.exercise && exercises.some((e) => e.key === searchParams.exercise)
      ? searchParams.exercise
      : exercises[0]?.key;

  const grouping =
    searchParams.grouping === "monthly" ? "monthly" : ("weekly" as const);

  const progress = exerciseKey
    ? await getExerciseProgressData(
        session.gymId,
        session.memberId,
        exerciseKey,
        grouping,
      )
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold">Workout progress</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track strength gains over time.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/member/workout">Back to workout</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Exercise progress</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense
            fallback={
              <p className="text-sm text-muted-foreground">Loading progress…</p>
            }
          >
            <ExerciseProgressPanel
              exercises={exercises}
              initialExerciseKey={exerciseKey}
              initialGrouping={grouping}
              progress={progress}
            />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
