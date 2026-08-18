import { requireMember } from "@/lib/member-session";
import { getMemberPortalOverview } from "@/lib/member-portal/queries";
import { getSuggestedWorkoutDay } from "@/lib/workout-tracking/suggested-day";
import { MemberPortalOverviewPanel } from "@/components/member-portal/member-portal-overview";

export default async function MemberOverviewPage() {
  const session = await requireMember();
  const [overview, suggestion] = await Promise.all([
    getMemberPortalOverview(session.gymId, session.memberId),
    getSuggestedWorkoutDay(session.gymId, session.memberId),
  ]);
  if (!overview) {
    return <p className="text-muted-foreground">Unable to load your account.</p>;
  }

  return (
    <MemberPortalOverviewPanel overview={overview} suggestion={suggestion} />
  );
}
