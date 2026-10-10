import Link from "next/link";

import { MemberExerciseDetail } from "@/components/member-portal/workout/member-exercise-detail";
import { MemberWorkoutTheme } from "@/components/member-portal/workout/member-workout-theme";
import { requireMember } from "@/lib/member-session";
import { parseMemberLibraryMuscleGroup } from "@/lib/member-portal/member-library-muscle-groups";
import { memberWorkoutPageHref } from "@/lib/member-portal/member-workout-tab-url";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PageProps = {
  params: Promise<{ catalogId: string }>;
  searchParams: Promise<{ addTo?: string; group?: string }>;
};

export default async function MemberExerciseLibraryDetailPage({
  params,
  searchParams,
}: PageProps) {
  await requireMember();
  const { catalogId } = await params;
  const { addTo, group } = await searchParams;
  const libraryGroup = parseMemberLibraryMuscleGroup(group);

  return (
    <MemberWorkoutTheme>
      <Link
        href={memberWorkoutPageHref({
          tab: "library",
          addTo: addTo ?? null,
          group: libraryGroup,
        })}
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
      >
        Back
      </Link>
      <MemberExerciseDetail
        catalogId={decodeURIComponent(catalogId)}
        addToWorkoutId={addTo ?? null}
        libraryGroup={libraryGroup}
      />
    </MemberWorkoutTheme>
  );
}
