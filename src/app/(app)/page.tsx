import { Suspense } from "react";
import {
  Users,
  TrendingUp,
  AlertTriangle,
  CalendarClock,
  LineChart,
  UserPlus,
  Percent,
  Wallet,
  PieChart,
} from "lucide-react";

import { requireGym } from "@/lib/session";
import {
  canLogPayments,
  canManageMembers,
  canManagePackages,
  canViewFinancials,
} from "@/lib/permissions";
import { withTenant } from "@/lib/db-context";
import {
  getDashboardMetrics,
  getFinancialSparklines,
  formatTrendLabel,
} from "@/lib/dashboard-metrics";
import { getMonthlyRevenueTrend } from "@/lib/revenue";
import { formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { RevenueTrendChart } from "@/components/revenue-trend-chart";
import { PackageDistributionChart } from "@/components/package-distribution-chart";
import { DashboardStatCard } from "@/components/dashboard-stat-card";
import { DashboardRenewalPanel } from "@/components/dashboard-renewal-panel";
import { DashboardQuickActions } from "@/components/dashboard-quick-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DashboardPage() {
  const user = await requireGym();
  const showFinancials = canViewFinancials(user.role);
  const canLog = canLogPayments(user.role);

  return (
    <div className="relative">
      <Suspense
        fallback={
          <DashboardSkeleton
            showFinancials={showFinancials}
            showPending={canLog}
          />
        }
      >
        <DashboardBody
          gymId={user.gymId}
          userName={user.name ?? null}
          showFinancials={showFinancials}
          canLogPayments={canLog}
          canManageMembers={canManageMembers(user.role)}
          canManagePackages={canManagePackages(user.role)}
        />
      </Suspense>
    </div>
  );
}

async function DashboardBody({
  gymId: tenantGymId,
  userName,
  showFinancials,
  canLogPayments,
  canManageMembers,
  canManagePackages,
}: {
  gymId: string;
  userName: string | null;
  showFinancials: boolean;
  canLogPayments: boolean;
  canManageMembers: boolean;
  canManagePackages: boolean;
}) {
  const metrics = await getDashboardMetrics(tenantGymId);

  let monthRevenue = 0;
  let revenueTrend: Awaited<ReturnType<typeof getMonthlyRevenueTrend>> = [];
  let financialSparklines: Awaited<ReturnType<typeof getFinancialSparklines>> | null =
    null;
  let revenueTrendLabel: string | undefined;

  if (showFinancials) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const [agg, trend, finSparklines] = await (async () => {
      const aggResult = await withTenant(tenantGymId, (tx) =>
        tx.payment.aggregate({
          _sum: { amount: true },
          where: {
            gymId: tenantGymId,
            paidAt: { gte: start, lt: end },
          },
        }),
      );
      const trendResult = await getMonthlyRevenueTrend(tenantGymId);
      const finResult = await getFinancialSparklines(
        tenantGymId,
        metrics.collectionExpected,
        metrics.pendingTotal,
        trendResult.map((point) => point.revenue),
      );
      return [aggResult, trendResult, finResult] as const;
    })();
    monthRevenue = Number(agg._sum.amount ?? 0);
    revenueTrend = trend;
    financialSparklines = finSparklines;
    const rev = finSparklines.revenue;
    if (rev.length >= 2) {
      revenueTrendLabel = formatTrendLabel(rev[rev.length - 1], rev[rev.length - 2]);
    }
  } else if (canLogPayments) {
    financialSparklines = await getFinancialSparklines(
      tenantGymId,
      metrics.collectionExpected,
      metrics.pendingTotal,
      [],
    );
  }

  return (
    <>
      <div className="mb-6 flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 [&>div]:mb-0">
          <PageHeader
            title={`Welcome back${userName ? `, ${userName.split(" ")[0]}` : ""}`}
            description="Here is what is happening at your gym."
          />
        </div>
        <DashboardQuickActions
          className="w-full min-w-0 justify-start lg:w-auto"
          canManageMembers={canManageMembers}
          canLogPayments={canLogPayments}
          canManagePackages={canManagePackages}
          showFinancialReports={showFinancials}
        />
      </div>

      <section
        aria-label="Key metrics"
        className="relative z-10 -mt-1 mb-3 grid min-w-0 auto-rows-fr gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <DashboardStatCard
          title="Active members"
          value={String(metrics.activeCount)}
          hint={`${metrics.totalMembers} total members`}
          trendLabel={metrics.activeMembersTrendLabel}
          icon={<Users className="h-5 w-5" />}
          href="/members"
          tone="green"
          sparkline={metrics.sparklines.activeMembers}
        />

        {showFinancials ? (
          <DashboardStatCard
            title="Revenue this month"
            value={formatCurrency(monthRevenue)}
            hint="Payments recorded this month"
            trendLabel={revenueTrendLabel}
            icon={<TrendingUp className="h-5 w-5" />}
            href="/payments"
            tone="primary"
            sparkline={financialSparklines?.revenue ?? []}
          />
        ) : null}

        <DashboardStatCard
          title="Expiring soon"
          value={String(metrics.expiringSoonCount)}
          hint="Ending within 7 days"
          icon={<CalendarClock className="h-5 w-5" />}
          href="/renewals"
          tone="orange"
          sparkline={metrics.sparklines.expiringSoon}
          footerLabel="View upcoming"
        />

        <DashboardStatCard
          title="Expired subscriptions"
          value={String(metrics.expiredCount)}
          hint="Members who need to renew"
          icon={<AlertTriangle className="h-5 w-5" />}
          href="/expired"
          tone="red"
          sparkline={metrics.sparklines.expired}
          footerLabel="View expired"
        />
      </section>

      <section
        aria-label="Additional metrics"
        className="relative z-10 mb-8 grid min-w-0 auto-rows-fr gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        <DashboardStatCard
          title="New members this month"
          value={String(metrics.newMembersThisMonth)}
          hint={metrics.newMembersHint}
          trendLabel={metrics.newMembersTrendLabel}
          icon={<UserPlus className="h-5 w-5" />}
          href="/members"
          tone="primary"
          sparkline={metrics.sparklines.newMembers}
        />

        {showFinancials ? (
          <DashboardStatCard
            title="Collection rate"
            value={`${metrics.collectionRatePercent}%`}
            hint={metrics.collectionHint}
            icon={<Percent className="h-5 w-5" />}
            href="/payments"
            tone="primary"
            sparkline={financialSparklines?.collectionRate ?? []}
          />
        ) : null}

        {canLogPayments ? (
          <DashboardStatCard
            title="Pending payments"
            value={formatCurrency(metrics.pendingTotal)}
            hint={metrics.pendingHint}
            icon={<Wallet className="h-5 w-5" />}
            href="/payments?tab=pending"
            tone="amber"
            sparkline={financialSparklines?.pending ?? []}
            footerLabel="View pending"
          />
        ) : null}
      </section>

      <div className="mb-6 grid min-w-0 gap-6 lg:grid-cols-2">
        <div className="min-w-0">
          <DashboardRenewalPanel variant="upcoming" items={metrics.upcomingPreview} />
        </div>
        <div className="min-w-0">
          <DashboardRenewalPanel variant="expired" items={metrics.expiredPreview} />
        </div>
      </div>

      {showFinancials ? (
        <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-2">
          <Card className="min-w-0 rounded-2xl border-0 bg-card/90 shadow-soft ring-1 ring-border/70 backdrop-blur-sm">
            <CardHeader className="min-w-0 space-y-1.5 p-4 sm:p-6">
              <CardTitle className="flex min-w-0 items-center gap-2 text-base sm:text-lg">
                <LineChart className="h-5 w-5 text-primary" />
                Revenue trend
              </CardTitle>
              <CardDescription>
                Monthly payments collected over the last 6 months.
              </CardDescription>
            </CardHeader>
            <CardContent className="min-w-0 p-4 pt-0 sm:p-6 sm:pt-0">
              <RevenueTrendChart data={revenueTrend} />
            </CardContent>
          </Card>

          <Card className="min-w-0 rounded-2xl border-0 bg-card/90 shadow-soft ring-1 ring-border/70 backdrop-blur-sm">
            <CardHeader className="min-w-0 space-y-1.5 p-4 sm:p-6">
              <CardTitle className="flex min-w-0 items-center gap-2 text-base sm:text-lg">
                <PieChart className="h-5 w-5 text-primary" />
                Membership distribution
              </CardTitle>
              <CardDescription>
                Active members by package type.
              </CardDescription>
            </CardHeader>
            <CardContent className="min-w-0 p-4 pt-0 sm:p-6 sm:pt-0">
              <PackageDistributionChart data={metrics.packageDistribution} />
            </CardContent>
          </Card>
        </div>
      ) : null}
    </>
  );
}

function DashboardSkeleton({
  showFinancials,
  showPending,
}: {
  showFinancials: boolean;
  showPending: boolean;
}) {
  const row1Count = showFinancials ? 4 : 3;
  let row2Count = 1;
  if (showFinancials) row2Count = 2;
  if (showPending) row2Count += 1;

  const kpiPlaceholder = (
    <Card className="rounded-2xl border-0 bg-card/90 shadow-soft ring-1 ring-border/70">
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-muted" />
          <div className="h-3 w-24 rounded bg-muted" />
        </div>
        <div className="space-y-2">
          <div className="h-8 w-20 rounded bg-muted" />
          <div className="h-3 w-32 rounded bg-muted" />
        </div>
        <div className="flex items-end justify-between">
          <div className="h-3 w-28 rounded bg-muted" />
          <div className="h-10 w-28 rounded-md bg-muted/60" />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="animate-pulse">
      <div className="mb-6 h-16 rounded-lg bg-muted/50" />
      <section className="relative z-10 -mt-1 mb-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: row1Count }).map((_, i) => (
          <div key={`r1-${i}`}>{kpiPlaceholder}</div>
        ))}
      </section>
      <section className="relative z-10 mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: row2Count }).map((_, i) => (
          <div key={`r2-${i}`}>{kpiPlaceholder}</div>
        ))}
      </section>
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card className="h-64 rounded-2xl bg-muted/30" />
        <Card className="h-64 rounded-2xl bg-muted/30" />
      </div>
      {showFinancials ? (
        <Card className="rounded-2xl bg-muted/30">
          <CardHeader>
            <div className="h-5 w-40 rounded bg-muted" />
          </CardHeader>
          <CardContent>
            <div className="h-[280px] rounded-lg bg-muted/50" />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
