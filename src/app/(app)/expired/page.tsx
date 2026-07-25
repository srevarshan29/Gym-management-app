import { requireGym } from "@/lib/session";
import { getExpiredMemberships } from "@/lib/queries";
import { PageHeader } from "@/components/page-header";
import { MembershipRenewalList } from "@/components/membership-renewal-list";

export default async function ExpiredMembershipsPage() {
  const user = await requireGym();
  const rows = await getExpiredMemberships(user.gymId);

  const items = rows.map((row) => ({
    ...row,
    endDate: row.endDate.toISOString(),
  }));

  return (
    <div>
      <PageHeader
        title="Expired Memberships"
        description={
          rows.length === 0
            ? "No members with an expired subscription."
            : `${rows.length} member${rows.length === 1 ? "" : "s"} need renewal.`
        }
      />

      <MembershipRenewalList
        items={items}
        variant="expired"
        emptyMessage="No expired memberships. All current subscriptions are active or expiring soon."
        searchPlaceholder="Search by member name or package…"
      />
    </div>
  );
}
