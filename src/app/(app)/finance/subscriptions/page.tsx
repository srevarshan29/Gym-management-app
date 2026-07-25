import { requireGym } from "@/lib/session";
import { ComingSoonState } from "@/components/coming-soon-state";

export default async function SubscriptionsPage() {
  await requireGym();

  return (
    <ComingSoonState
      title="Subscriptions"
      description="Active plans, renewals, and membership lifecycle."
    />
  );
}
