import { MemberPersonalWorkoutEditor } from "@/components/member-portal/workout/member-personal-workout-editor";
import { MemberWorkoutTheme } from "@/components/member-portal/workout/member-workout-theme";
import { requireMember } from "@/lib/member-session";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function MemberPersonalWorkoutPage({ params }: PageProps) {
  await requireMember();
  const { id } = await params;

  return (
    <MemberWorkoutTheme>
      <MemberPersonalWorkoutEditor workoutId={id} />
    </MemberWorkoutTheme>
  );
}
