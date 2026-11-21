import { Suspense } from "react";

import { getPortalMemberDoc } from "@/lib/member-portal/member-doc-cache";
import { isPersonalWorkoutsEnabled } from "@/lib/member-portal/personal-workouts-access";
import { requireMember } from "@/lib/member-session";
import { loadMemberWorkoutPageData } from "@/lib/workout-tracking/member-workout-page";
import { redirect } from "next/navigation";
import { MemberWorkoutPageClient } from "@/components/member-portal/workout/member-workout-page-client";
import { LockedLink } from "@/components/navigation/locked-link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PageProps = {
  searchParams: Promise<{
    tab?: string;
    planFilter?: string;
    addTo?: string;
    created?: string;
    group?: string;
    region?: string;
    chestAll?: string;
  }>;
};

export default async function MemberWorkoutPage({ searchParams }: PageProps) {
  const session = await requireMember();
  const { tab, addTo, created } = await searchParams;
  const ctx = {
    kind: "member" as const,
    gymId: session.gymId,
    memberId: session.memberId,
  };
  const memberDoc = await getPortalMemberDoc(ctx);
  const personalWorkoutsEnabled = isPersonalWorkoutsEnabled(memberDoc);

  if (!personalWorkoutsEnabled && addTo?.trim()) {
    redirect("/member/workout?tab=assigned");
  }

  const initialTab =
    tab ??
    (addTo?.trim() ? "library" : null);

  const { plan, activeSession, canStart } = await loadMemberWorkoutPageData(
    session.gymId,
    session.memberId,
  );

  return (
    <div className="space-y-3">
      {activeSession ? null : (
        <div className="flex items-start justify-between gap-3 px-1">
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight">
              Workout
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your plan, personal workouts, and exercise library.
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
          canStart={canStart}
          initialTab={initialTab}
          addToWorkoutId={addTo?.trim() || null}
          createdWorkoutId={created?.trim() || null}
          personalWorkoutsEnabled={personalWorkoutsEnabled}
        />
      </Suspense>
    </div>
  );
}
