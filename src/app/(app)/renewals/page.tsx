import { requireGym } from "@/lib/session";
import { getUpcomingRenewals } from "@/lib/queries";
import { EXPIRING_SOON_DAYS } from "@/lib/subscription";
import { PageHeader } from "@/components/page-header";
import { MembershipRenewalList } from "@/components/membership-renewal-list";

export default async function UpcomingRenewalsPage() {
  const user = await requireGym();
  const rows = await getUpcomingRenewals(user.gymId);

  const items = rows.map((row) => ({
    ...row,
    endDate: row.endDate.toISOString(),
  }));

  return (
    <div>
      <PageHeader
        title="Upcoming Renewals"
        description={
          rows.length === 0
            ? `No subscriptions expiring in the next ${EXPIRING_SOON_DAYS} days.`
            : `${rows.length} member${rows.length === 1 ? "" : "s"} expiring within ${EXPIRING_SOON_DAYS} days.`
        }
      />

      <MembershipRenewalList
        items={items}
        variant="upcoming"
        emptyMessage={`No upcoming renewals. No subscriptions expire in the next ${EXPIRING_SOON_DAYS} days.`}
        searchPlaceholder="Search by member name or plan…"
      />
    </div>
  );
}
