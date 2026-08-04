import { Suspense } from "react";
import { CalendarClock, CalendarX2, Users } from "lucide-react";

import { requireGym } from "@/lib/session";
import { getSubscriptionSummaryCounts } from "@/lib/queries";
import { EXPIRING_SOON_DAYS } from "@/lib/subscription";
import { PageHeader } from "@/components/page-header";
import { DashboardStatCard } from "@/components/dashboard-stat-card";
import {
  FinanceSubscriptionsPageSkeleton,
  PageHeaderSkeleton,
} from "@/components/page-loading-skeletons";

export default async function SubscriptionsPage() {
  const user = await requireGym();

  return (
    <Suspense fallback={<SubscriptionsPageSkeleton />}>
      <SubscriptionsPageContent gymId={user.gymId} />
    </Suspense>
  );
}

function SubscriptionsPageSkeleton() {
  return (
    <div className="animate-pulse">
      <PageHeaderSkeleton />
      <FinanceSubscriptionsPageSkeleton />
    </div>
  );
}

async function SubscriptionsPageContent({ gymId }: { gymId: string }) {
  const counts = await getSubscriptionSummaryCounts(gymId);

  return (
    <div>
      <PageHeader
        title="Subscriptions"
        description="Membership lifecycle at a glance. Each category is distinct—open a list for details."
      />

      <section
        aria-label="Subscription summary"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        <DashboardStatCard
          title="Active subscriptions"
          value={String(counts.active)}
          hint="Current plan, not expiring within 7 days"
          icon={<Users className="h-5 w-5" />}
          href="/members"
          tone="green"
          footerLabel="View all members"
        />
        <DashboardStatCard
          title="Expiring soon"
          value={String(counts.expiringSoon)}
          hint={`Ending within ${EXPIRING_SOON_DAYS} days`}
          icon={<CalendarClock className="h-5 w-5" />}
          href="/renewals"
          tone="orange"
          footerLabel="View upcoming renewals"
        />
        <DashboardStatCard
          title="Expired"
          value={String(counts.expired)}
          hint="Members who need to renew"
          icon={<CalendarX2 className="h-5 w-5" />}
          href="/expired"
          tone="red"
          footerLabel="View expired memberships"
        />
      </section>
    </div>
  );
}
