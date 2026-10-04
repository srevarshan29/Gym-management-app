import { Suspense } from "react";

import { requireGym } from "@/lib/session";
import { canManageNotificationSettings } from "@/lib/permissions";
import { listManualRenewalReminderTargets } from "@/lib/manual-renewal-reminders/targets";
import {
  getExpiredMembershipsPage,
  MEMBERSHIP_RENEWAL_PAGE_SIZE,
} from "@/lib/membership-renewal-queries";
import { PageHeader } from "@/components/page-header";
import { RenewalListPageSkeleton } from "@/components/page-loading-skeletons";
import { MembershipRenewalList } from "@/components/membership-renewal-list";

export default async function ExpiredMembershipsPage({
  searchParams,
}: {
  searchParams?: { page?: string; q?: string };
}) {
  const user = await requireGym();
  const page = Number(searchParams?.page ?? "1");
  const q = searchParams?.q ?? "";
  const showManualReminders = canManageNotificationSettings(user.role);

  return (
    <Suspense fallback={<ExpiredMembershipsPageSkeleton />}>
      <ExpiredMembershipsPageContent
        gymId={user.gymId}
        page={page}
        q={q}
        showManualReminders={showManualReminders}
      />
    </Suspense>
  );
}

function ExpiredMembershipsPageSkeleton() {
  return (
    <div className="animate-pulse">
      <PageHeader
        title="Expired Memberships"
        description="Members whose current subscription has expired."
      />
      <RenewalListPageSkeleton />
    </div>
  );
}

async function ExpiredMembershipsPageContent({
  gymId,
  page,
  q,
  showManualReminders,
}: {
  gymId: string;
  page: number;
  q: string;
  showManualReminders: boolean;
}) {
  const result = await getExpiredMembershipsPage(gymId, {
    page,
    pageSize: MEMBERSHIP_RENEWAL_PAGE_SIZE,
    q,
  });

  const bulkTargets = showManualReminders
    ? await listManualRenewalReminderTargets(gymId, "expired", q)
    : [];
  const bulkEmailRecipientCount = bulkTargets.filter((t) =>
    t.email?.trim(),
  ).length;

  const items = result.rows.map((row) => ({
    ...row,
    endDate: row.endDate.toISOString(),
  }));

  return (
    <div>
      <PageHeader
        title="Expired Memberships"
        description={
          result.bucketCount === 0
            ? "No members with an expired subscription."
            : `${result.bucketCount} member${result.bucketCount === 1 ? "" : "s"} need renewal.`
        }
      />

      <MembershipRenewalList
        items={items}
        variant="expired"
        emptyMessage="No expired memberships. All current subscriptions are active or expiring soon."
        searchPlaceholder="Search by member name or package…"
        query={q}
        page={result.page}
        pageSize={result.pageSize}
        matchingCount={result.matchingCount}
        bucketCount={result.bucketCount}
        searchAction="/expired"
        showManualReminders={showManualReminders}
        bulkEmailRecipientCount={bulkEmailRecipientCount}
      />
    </div>
  );
}
