import { requireGym } from "@/lib/session";
import { ComingSoonState } from "@/components/coming-soon-state";

export default async function VisitorsPage() {
  await requireGym();

  return (
    <ComingSoonState
      title="Visitors"
      description="Day passes and walk-in visitor management."
    />
  );
}
