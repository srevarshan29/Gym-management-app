import Link from "next/link";

import { MemberPersonalWorkoutEditor } from "@/components/member-portal/workout/member-personal-workout-editor";
import { requireMember } from "@/lib/member-session";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function MemberPersonalWorkoutPage({ params }: PageProps) {
  await requireMember();
  const { id } = await params;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link
          href="/member/workout?tab=mine"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          Back
        </Link>
        <h1 className="font-display text-lg font-bold">Edit workout</h1>
      </div>
      <MemberPersonalWorkoutEditor workoutId={id} />
    </div>
  );
}
