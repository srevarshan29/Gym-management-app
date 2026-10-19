"use client";

import { useMemberDashboardLiveMessageText } from "@/components/member-portal/dashboard/member-dashboard-water-live";
import type { SuggestedWorkoutDay } from "@/lib/workout-tracking/types";

export function MemberDashboardLiveBanner({
  greetingName,
  memberId,
  suggestion,
}: {
  greetingName: string;
  memberId: string;
  suggestion: SuggestedWorkoutDay;
}) {
  const messageText = useMemberDashboardLiveMessageText(
    memberId,
    greetingName,
    suggestion,
  );

  return (
    <div>
      <h1 className="font-display text-xl font-bold leading-tight">
        Hi, {greetingName}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">{messageText}</p>
    </div>
  );
}
