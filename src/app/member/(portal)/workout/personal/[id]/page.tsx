import Link from "next/link";

import { MemberPersonalWorkoutEditor } from "@/components/member-portal/workout/member-personal-workout-editor";
import { MemberWorkoutTheme } from "@/components/member-portal/workout/member-workout-theme";
import { requireMember } from "@/lib/member-session";
import { memberWorkoutPageHref } from "@/lib/member-portal/member-workout-tab-url";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function MemberPersonalWorkoutPage({ params }: PageProps) {
  await requireMember();
  const { id } = await params;

  return (
    <MemberWorkoutTheme>
      <div className="flex items-center gap-2">
        <Link
          href={memberWorkoutPageHref({ tab: "mine" })}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          Back
        </Link>
        <h1 className="font-display text-lg font-bold">Edit workout</h1>
      </div>
      <MemberPersonalWorkoutEditor workoutId={id} />
    </MemberWorkoutTheme>
  );
}
