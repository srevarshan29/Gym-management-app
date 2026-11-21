import { redirect } from "next/navigation";

import { MemberPersonalWorkoutEditor } from "@/components/member-portal/workout/member-personal-workout-editor";
import { MemberWorkoutTheme } from "@/components/member-portal/workout/member-workout-theme";
import { getPortalMemberDoc } from "@/lib/member-portal/member-doc-cache";
import { isPersonalWorkoutsEnabled } from "@/lib/member-portal/personal-workouts-access";
import { requireMember } from "@/lib/member-session";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function MemberPersonalWorkoutPage({ params }: PageProps) {
  const session = await requireMember();
  const memberDoc = await getPortalMemberDoc({
    kind: "member",
    gymId: session.gymId,
    memberId: session.memberId,
  });
  if (!isPersonalWorkoutsEnabled(memberDoc)) {
    redirect("/member/workout?tab=assigned");
  }

  const { id } = await params;

  return (
    <MemberWorkoutTheme>
      <MemberPersonalWorkoutEditor workoutId={id} />
    </MemberWorkoutTheme>
  );
}
