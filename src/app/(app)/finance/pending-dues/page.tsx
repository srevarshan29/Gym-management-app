import { requireGym } from "@/lib/session";
import { ComingSoonState } from "@/components/coming-soon-state";

export default async function PendingDuesPage() {
  await requireGym();

  return (
    <ComingSoonState
      title="Pending Dues"
      description="Outstanding balances and follow-up collections."
    />
  );
}
