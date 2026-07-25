import { Suspense } from "react";
import Link from "next/link";
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
import { getDashboardMetrics, getFinancialSparklines } from "@/lib/dashboard-metrics";
import { getMonthlyRevenueTrend } from "@/lib/revenue";
import { formatCurrency, formatDate } from "@/lib/utils";
import { daysUntil } from "@/lib/subscription";
import { PageHeader } from "@/components/page-header";
import { MemberAvatar } from "@/components/member-avatar";
import { RevenueTrendChart } from "@/components/revenue-trend-chart";
import { PackageDistributionChart } from "@/components/package-distribution-chart";
import { DashboardStatCard } from "@/components/dashboard-stat-card";
import { DashboardAlerts } from "@/components/dashboard-alerts";
import { DashboardQuickActions } from "@/components/dashboard-quick-actions";
import { StatusBadge } from "@/components/status-badge";
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
  gymId,
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
  const metrics = await getDashboardMetrics(gymId);

  let monthRevenue = 0;
  let revenueTrend: Awaited<ReturnType<typeof getMonthlyRevenueTrend>> = [];
  let financialSparklines: Awaited<ReturnType<typeof getFinancialSparklines>> | null =
    null;

  if (showFinancials) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const [agg, trend, finSparklines] = await Promise.all([
      withTenant(gymId, (tx) =>
        tx.payment.aggregate({
          _sum: { amount: true },
          where: { gymId, paidAt: { gte: start, lt: end } },
        }),
      ),
      getMonthlyRevenueTrend(gymId),
      getFinancialSparklines(
        gymId,
        metrics.collectionExpected,
        metrics.pendingTotal,
      ),
    ]);
    monthRevenue = Number(agg._sum.amount ?? 0);
    revenueTrend = trend;
    financialSparklines = finSparklines;
  } else if (canLogPayments) {
    financialSparklines = await getFinancialSparklines(
      gymId,
      metrics.collectionExpected,
      metrics.pendingTotal,
    );
  }

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 [&>div]:mb-0">
          <PageHeader
            title={`Welcome back${userName ? `, ${userName.split(" ")[0]}` : ""}`}
            description="Here is what is happening at your gym."
          />
        </div>
        <DashboardQuickActions
          canManageMembers={canManageMembers}
          canLogPayments={canLogPayments}
          canManagePackages={canManagePackages}
        />
      </div>

      <section
        aria-label="Key metrics"
        className="relative z-10 -mt-1 mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        <DashboardStatCard
          title="Active members"
          value={String(metrics.activeCount)}
          hint={`${metrics.totalMembers} total members`}
          icon={<Users className="h-5 w-5" />}
          href="/members"
          tone="green"
          sparkline={metrics.sparklines.activeMembers}
        />

        <DashboardStatCard
          title="New members this month"
          value={String(metrics.newMembersThisMonth)}
          hint={metrics.newMembersHint}
          icon={<UserPlus className="h-5 w-5" />}
          href="/members"
          tone="primary"
          sparkline={metrics.sparklines.newMembers}
        />

        {showFinancials ? (
          <DashboardStatCard
            title="Revenue this month"
            value={formatCurrency(monthRevenue)}
            hint="Payments recorded this month"
            icon={<TrendingUp className="h-5 w-5" />}
            href="/payments"
            tone="blue"
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

        {showFinancials ? (
          <DashboardStatCard
            title="Collection rate"
            value={`${metrics.collectionRatePercent}%`}
            hint={metrics.collectionHint}
            icon={<Percent className="h-5 w-5" />}
            href="/payments"
            tone="blue"
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
          />
        ) : null}
      </section>

      <DashboardAlerts
        expiredCount={metrics.expiredCount}
        expiringSoonCount={metrics.expiringSoonCount}
        pendingCount={metrics.pendingMemberCount}
        showPending={canLogPayments}
      />

      <div
        className={`mt-6 grid gap-6 ${showFinancials ? "lg:grid-cols-2" : ""}`}
      >
        {showFinancials ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5 text-muted-foreground" />
                Revenue trend
              </CardTitle>
              <CardDescription>
                Monthly payments collected over the last 6 months (actual amounts
                paid, including partial installments).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RevenueTrendChart data={revenueTrend} />
            </CardContent>
          </Card>
        ) : null}

        <Card className={showFinancials ? undefined : "col-span-full"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-muted-foreground" />
              Membership distribution
            </CardTitle>
            <CardDescription>
              Active members by package type.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PackageDistributionChart data={metrics.packageDistribution} />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-muted-foreground" />
            Expiring soon
          </CardTitle>
          <CardDescription>
            Subscriptions ending within the next 7 days.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {metrics.expiringSoon.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No subscriptions expiring in the next 7 days.
            </p>
          ) : (
            <ul className="divide-y">
              {metrics.expiringSoon.map((m) => {
                const days = m.endDate ? daysUntil(m.endDate) : 0;
                return (
                  <li key={m.id}>
                    <Link
                      href={`/members/${m.id}`}
                      className="hover-lift-row flex items-center justify-between gap-4 py-3 transition-colors hover:bg-accent/50"
                    >
                      <div className="flex items-center gap-3">
                        <MemberAvatar
                          name={m.name}
                          photoUrl={m.photoUrl}
                          gender={m.gender}
                          seed={m.id}
                          size="sm"
                        />
                        <div>
                          <p className="font-medium">{m.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {m.packageName ?? "No package"} ·{" "}
                            <span className="font-mono">
                              {m.endDate ? formatDate(m.endDate) : "—"}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm text-muted-foreground">
                          {days <= 0
                            ? "Expires today"
                            : `${days} day${days === 1 ? "" : "s"} left`}
                        </span>
                        <StatusBadge status={m.status} />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
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
  let cardCount = 4;
  if (showFinancials) cardCount = 7;
  else if (showPending) cardCount = 5;

  return (
    <div className="animate-pulse">
      <div className="mb-6 h-16 rounded-lg bg-muted/50" />
      <section
        aria-label="Key metrics"
        className="relative z-10 -mt-1 mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        {Array.from({ length: cardCount }).map((_, i) => (
          <Card
            key={i}
            className="rounded-2xl border-0 bg-card/90 shadow-soft ring-1 ring-border/70"
          >
            <CardContent className="space-y-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-muted" />
                <div className="h-9 w-24 shrink-0 rounded-md bg-muted/60" />
              </div>
              <div className="space-y-2">
                <div className="h-3 w-24 rounded bg-muted" />
                <div className="h-8 w-20 rounded bg-muted" />
                <div className="h-3 w-32 rounded bg-muted" />
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
      <Card className="mt-6">
        <CardHeader>
          <div className="h-5 w-40 rounded bg-muted" />
        </CardHeader>
        <CardContent className="h-12 rounded bg-muted/50" />
      </Card>
      <div className={`mt-6 grid gap-6 ${showFinancials ? "lg:grid-cols-2" : ""}`}>
        {showFinancials ? (
          <Card>
            <CardHeader>
              <div className="h-5 w-36 rounded bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="h-[280px] rounded-lg bg-muted/50" />
            </CardContent>
          </Card>
        ) : null}
        <Card>
          <CardHeader>
            <div className="h-5 w-44 rounded bg-muted" />
          </CardHeader>
          <CardContent>
            <div className="h-[280px] rounded-lg bg-muted/50" />
          </CardContent>
        </Card>
      </div>
      <Card className="mt-6">
        <CardHeader>
          <div className="h-5 w-40 rounded bg-muted" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-1">
              <div className="h-9 w-9 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-1/3 rounded bg-muted" />
                <div className="h-3 w-1/4 rounded bg-muted" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
