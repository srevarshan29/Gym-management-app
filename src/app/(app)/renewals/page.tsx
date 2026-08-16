import { Suspense } from "react";

import { requireGym } from "@/lib/session";
import {
  getUpcomingRenewalsPage,
  MEMBERSHIP_RENEWAL_PAGE_SIZE,
} from "@/lib/membership-renewal-queries";
import { EXPIRING_SOON_DAYS } from "@/lib/subscription";
import { PageHeader } from "@/components/page-header";
import { RenewalListPageSkeleton } from "@/components/page-loading-skeletons";
import { MembershipRenewalList } from "@/components/membership-renewal-list";

export default async function UpcomingRenewalsPage({
  searchParams,
}: {
  searchParams?: { page?: string; q?: string };
}) {
  const user = await requireGym();
  const page = Number(searchParams?.page ?? "1");
  const q = searchParams?.q ?? "";

  return (
    <Suspense fallback={<UpcomingRenewalsPageSkeleton />}>
      <UpcomingRenewalsPageContent gymId={user.gymId} page={page} q={q} />
    </Suspense>
  );
}

function UpcomingRenewalsPageSkeleton() {
  return (
    <div className="animate-pulse">
      <PageHeader
        title="Upcoming Renewals"
        description={`Subscriptions expiring within ${EXPIRING_SOON_DAYS} days.`}
      />
      <RenewalListPageSkeleton />
    </div>
  );
}

async function UpcomingRenewalsPageContent({
  gymId,
  page,
  q,
}: {
  gymId: string;
  page: number;
  q: string;
}) {
  const result = await getUpcomingRenewalsPage(gymId, {
    page,
    pageSize: MEMBERSHIP_RENEWAL_PAGE_SIZE,
    q,
  });

  const items = result.rows.map((row) => ({
    ...row,
    endDate: row.endDate.toISOString(),
  }));

  return (
    <div>
      <PageHeader
        title="Upcoming Renewals"
        description={
          result.bucketCount === 0
            ? `No subscriptions expiring in the next ${EXPIRING_SOON_DAYS} days.`
            : `${result.bucketCount} member${result.bucketCount === 1 ? "" : "s"} expiring within ${EXPIRING_SOON_DAYS} days.`
        }
      />

      <MembershipRenewalList
        items={items}
        variant="upcoming"
        emptyMessage={`No upcoming renewals. No subscriptions expire in the next ${EXPIRING_SOON_DAYS} days.`}
        searchPlaceholder="Search by member name or plan…"
        query={q}
        page={result.page}
        pageSize={result.pageSize}
        matchingCount={result.matchingCount}
        bucketCount={result.bucketCount}
        searchAction="/renewals"
      />
    </div>
  );
}
