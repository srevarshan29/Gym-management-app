import { Suspense } from "react";

import { requireMember } from "@/lib/member-session";
import { loadMemberWorkoutPageData } from "@/lib/workout-tracking/member-workout-page";
import { MemberWorkoutPageClient } from "@/components/member-portal/workout/member-workout-page-client";
import { LockedLink } from "@/components/navigation/locked-link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PageProps = {
  searchParams: Promise<{
    tab?: string;
    addTo?: string;
    created?: string;
    group?: string;
  }>;
};

export default async function MemberWorkoutPage({ searchParams }: PageProps) {
  const session = await requireMember();
  const { tab, addTo, created } = await searchParams;
  const initialTab =
    tab === "mine" || tab === "library" || tab === "assigned"
      ? tab
      : addTo?.trim()
        ? "library"
        : "assigned";

  const { plan, activeSession, previousSets, canStart } =
    await loadMemberWorkoutPageData(session.gymId, session.memberId);

  return (
    <div className="space-y-3">
      {activeSession ? null : (
        <div className="flex items-start justify-between gap-3 px-1">
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight">
              Workout
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Trainer plan, personal workouts, and exercise library.
            </p>
          </div>
          <LockedLink
            href="/member/workout/progress"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Progress
          </LockedLink>
        </div>
      )}

      <Suspense fallback={null}>
        <MemberWorkoutPageClient
          plan={plan}
          activeSession={activeSession}
          previousSets={previousSets}
          canStart={canStart}
          initialTab={initialTab}
          addToWorkoutId={addTo?.trim() || null}
          createdWorkoutId={created?.trim() || null}
        />
      </Suspense>
    </div>
  );
}
