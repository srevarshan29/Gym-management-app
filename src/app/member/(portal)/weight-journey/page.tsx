import { MemberWeightJourneyPanel } from "@/components/member-portal/weight-journey/member-weight-journey-panel";
import type { MemberContext } from "@/lib/firestore/context";
import { requireMember } from "@/lib/member-session";
import { loadWeightJourneySnapshot } from "@/lib/weight-journey/load-snapshot";

export default async function MemberWeightJourneyPage() {
  const session = await requireMember();
  const ctx: MemberContext = {
    kind: "member",
    gymId: session.gymId,
    memberId: session.memberId,
  };

  const snapshot = await loadWeightJourneySnapshot(
    ctx,
    session.gymId,
    session.memberId,
  );

  return (
    <div className="mx-auto w-full max-w-2xl space-y-2 px-1 pb-[max(7.5rem,calc(5.75rem+env(safe-area-inset-bottom,0px)))] sm:px-0">
      <MemberWeightJourneyPanel snapshot={snapshot} />
    </div>
  );
}
