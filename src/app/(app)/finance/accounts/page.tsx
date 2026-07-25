import { requireGym } from "@/lib/session";
import { ComingSoonState } from "@/components/coming-soon-state";

export default async function AccountsFinancePage() {
  await requireGym();

  return (
    <ComingSoonState
      title="Accounts & Finance"
      description="Ledgers, expenses, and financial reporting."
    />
  );
}
