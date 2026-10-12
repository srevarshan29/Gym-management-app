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

  const [overview, suggestion] = await Promise.all([
    getMemberPortalOverview(session.gymId, session.memberId),
    getSuggestedWorkoutDay(session.gymId, session.memberId),
  ]);

  if (!overview) {
    return <p className="text-muted-foreground">Unable to load your account.</p>;
  }

  const dashboard = await loadMemberPortalDashboard(
    ctx,
    suggestion,
    overview.memberName,
  );

  return (
    <MemberPortalOverviewPanel
      overview={overview}
      suggestion={suggestion}
      dashboard={dashboard}
    />
  );
}
