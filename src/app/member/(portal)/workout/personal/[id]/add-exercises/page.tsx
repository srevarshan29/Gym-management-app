import Link from "next/link";

import { MemberExerciseLibraryPanel } from "@/components/member-portal/workout/member-exercise-library-panel";
import { MemberWorkoutTheme } from "@/components/member-portal/workout/member-workout-theme";
import { parseMemberLibraryMuscleGroup } from "@/lib/member-portal/member-library-muscle-groups";
import {
  memberPersonalWorkoutEditorHref,
} from "@/lib/member-portal/member-workout-tab-url";
import { requireMember } from "@/lib/member-session";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ group?: string }>;
};

export default async function MemberPersonalWorkoutAddExercisesPage({
  params,
  searchParams,
}: PageProps) {
  await requireMember();
  const { id } = await params;
  const { group } = await searchParams;
  const initialGroup = parseMemberLibraryMuscleGroup(group);

  return (
    <MemberWorkoutTheme>
      <div className="flex items-center gap-2">
        <Link
          href={memberPersonalWorkoutEditorHref(id)}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          Back
        </Link>
        <h1 className="font-display text-lg font-bold">Add exercises</h1>
      </div>
      <MemberExerciseLibraryPanel
        addToWorkoutId={id}
        initialGroup={initialGroup}
        selectionMode
        doneHref={memberPersonalWorkoutEditorHref(id)}
        workoutIdForAddFlow={id}
      />
    </MemberWorkoutTheme>
  );
}
