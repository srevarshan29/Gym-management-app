import Link from "next/link";

import { MemberExerciseDetail } from "@/components/member-portal/workout/member-exercise-detail";
import { requireMember } from "@/lib/member-session";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PageProps = {
  params: Promise<{ catalogId: string }>;
  searchParams: Promise<{ addTo?: string }>;
};

export default async function MemberExerciseLibraryDetailPage({
  params,
  searchParams,
}: PageProps) {
  await requireMember();
  const { catalogId } = await params;
  const { addTo } = await searchParams;

  return (
    <div className="space-y-4">
      <Link
        href="/member/workout?tab=library"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
      >
        Back
      </Link>
      <MemberExerciseDetail
        catalogId={decodeURIComponent(catalogId)}
        addToWorkoutId={addTo ?? null}
      />
    </div>
  );
}
