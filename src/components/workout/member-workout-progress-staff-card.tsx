import { Suspense } from "react";

import { getMemberExerciseOptions, getExerciseProgressData } from "@/lib/workout-tracking/progress";
import { ExerciseProgressPanel } from "@/components/workout/exercise-progress-panel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type MemberWorkoutProgressStaffCardProps = {
  gymId: string;
  memberId: string;
  memberName: string;
  exerciseKey?: string;
  grouping?: "weekly" | "monthly";
};

async function StaffProgressContent({
  gymId,
  memberId,
  exerciseKey,
  grouping = "weekly",
}: Omit<MemberWorkoutProgressStaffCardProps, "memberName">) {
  const exercises = await getMemberExerciseOptions(gymId, memberId);
  const selectedKey =
    exerciseKey && exercises.some((e) => e.key === exerciseKey)
      ? exerciseKey
      : exercises[0]?.key;

  const progress = selectedKey
    ? await getExerciseProgressData(gymId, memberId, selectedKey, grouping)
    : null;

  return (
    <ExerciseProgressPanel
      exercises={exercises}
      initialExerciseKey={selectedKey}
      initialGrouping={grouping}
      progress={progress}
    />
  );
}

export function MemberWorkoutProgressStaffCard({
  gymId,
  memberId,
  memberName,
  exerciseKey,
  grouping = "weekly",
}: MemberWorkoutProgressStaffCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Workout progress</CardTitle>
        <CardDescription>Strength trends for {memberName}</CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense
          fallback={
            <p className="text-sm text-muted-foreground">Loading progress…</p>
          }
        >
          <StaffProgressContent
            gymId={gymId}
            memberId={memberId}
            exerciseKey={exerciseKey}
            grouping={grouping}
          />
        </Suspense>
      </CardContent>
    </Card>
  );
}
