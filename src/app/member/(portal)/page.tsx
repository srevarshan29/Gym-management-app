import { MemberPortalOverviewPanel } from "@/components/member-portal/member-portal-overview";
import { loadMemberPortalDashboard } from "@/lib/member-portal/load-member-portal-dashboard";
import { getMemberPortalOverview } from "@/lib/member-portal/queries";
import { requireMember } from "@/lib/member-session";
import { getSuggestedWorkoutDay } from "@/lib/workout-tracking/suggested-day";

export default async function MemberOverviewPage() {
  const session = await requireMember();
  const ctx = {
    kind: "member" as const,
    gymId: session.gymId,
    memberId: session.memberId,
  };

  const suggestion = await getSuggestedWorkoutDay(
    session.gymId,
    session.memberId,
  );

  const [overview, dashboard] = await Promise.all([
    getMemberPortalOverview(ctx),
    loadMemberPortalDashboard(ctx, suggestion, session.name),
  ]);

  if (!overview) {
    return <p className="text-muted-foreground">Unable to load your account.</p>;
  }

  return (
    <MemberPortalOverviewPanel
      overview={overview}
      suggestion={suggestion}
      dashboard={dashboard}
      memberId={session.memberId}
    />
  );
}
