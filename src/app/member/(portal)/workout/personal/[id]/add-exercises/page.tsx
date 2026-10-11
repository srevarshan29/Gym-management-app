import { redirect } from "next/navigation";

import { parseMemberLibraryMuscleGroup } from "@/lib/member-portal/member-library-muscle-groups";
import { memberPersonalWorkoutAddExercisesHref } from "@/lib/member-portal/member-workout-tab-url";
import { requireMember } from "@/lib/member-session";

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

  redirect(memberPersonalWorkoutAddExercisesHref(id, initialGroup));
}
