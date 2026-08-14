import { Suspense } from "react";
import { redirect } from "next/navigation";
import {
  BarChart3,
  CreditCard,
  LineChart,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";

import { requireGym } from "@/lib/session";
import { canViewFinancials } from "@/lib/permissions";
import { getAnalyticsPageData } from "@/lib/analytics-metrics";
import { formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { AnalyticsPageSkeleton } from "@/components/page-loading-skeletons";
import { DashboardStatCard } from "@/components/dashboard-stat-card";
import { MemberJoinsChart } from "@/components/member-joins-chart";
import { RevenueTrendChart } from "@/components/revenue-trend-chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function AnalyticsPage() {
  const user = await requireGym();
  if (!canViewFinancials(user.role)) {
    redirect("/");
  }

  return (
    <Suspense fallback={<AnalyticsPageSkeleton />}>
      <AnalyticsPageContent gymId={user.gymId} />
    </Suspense>
  );
}

async function AnalyticsPageContent({ gymId }: { gymId: string }) {
  const data = await getAnalyticsPageData(gymId);

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Gym performance insights and trends."
      />

      <section
        aria-label="Analytics summary"
        className="mb-8 grid min-w-0 auto-rows-fr gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <DashboardStatCard
          title="Total members"
          value={String(data.totalMembers)}
          hint="All members"
          icon={<Users className="h-5 w-5" />}
          href="/members"
          tone="green"
        />

        <DashboardStatCard
          title="Payments logged"
          value={String(data.paymentsLoggedThisMonth)}
          hint="Recorded this month"
          icon={<CreditCard className="h-5 w-5" />}
          href="/payments"
          tone="primary"
        />

        <DashboardStatCard
          title="Visitors"
          value={String(data.visitorsCount)}
          hint="Pending walk-ins"
          icon={<UserCheck className="h-5 w-5" />}
          tone="primary"
        />

        <DashboardStatCard
          title="Avg revenue/mo"
          value={formatCurrency(data.avgRevenuePerMonth)}
          hint="Last 12 months average"
          icon={<TrendingUp className="h-5 w-5" />}
          href="/payments"
          tone="primary"
        />
      </section>

      <div className="grid min-w-0 gap-6 lg:grid-cols-2">
        <Card className="min-w-0 rounded-2xl border-0 bg-card/90 shadow-soft ring-1 ring-border/70 backdrop-blur-sm">
          <CardHeader className="min-w-0 space-y-1.5 p-4 sm:p-6">
            <CardTitle className="flex min-w-0 items-center gap-2 text-base sm:text-lg">
              <BarChart3 className="h-5 w-5 text-primary" />
              Member joins
            </CardTitle>
            <CardDescription>
              New member signups per month over the last 12 months.
            </CardDescription>
          </CardHeader>
          <CardContent className="min-w-0 p-4 pt-0 sm:p-6 sm:pt-0">
            <MemberJoinsChart data={data.memberJoins} />
          </CardContent>
        </Card>

        <Card className="min-w-0 rounded-2xl border-0 bg-card/90 shadow-soft ring-1 ring-border/70 backdrop-blur-sm">
          <CardHeader className="min-w-0 space-y-1.5 p-4 sm:p-6">
            <CardTitle className="flex min-w-0 items-center gap-2 text-base sm:text-lg">
              <LineChart className="h-5 w-5 text-primary" />
              Revenue trend
            </CardTitle>
            <CardDescription>
              Monthly payments collected over the last 12 months.
            </CardDescription>
          </CardHeader>
          <CardContent className="min-w-0 p-4 pt-0 sm:p-6 sm:pt-0">
            <RevenueTrendChart data={data.revenueTrend} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
