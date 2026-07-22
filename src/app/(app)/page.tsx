import { Suspense } from "react";
import Link from "next/link";
import { Users, TrendingUp, AlertTriangle, CalendarClock, LineChart } from "lucide-react";

import { requireGym } from "@/lib/session";
import { canViewFinancials } from "@/lib/permissions";
import { withTenant } from "@/lib/db-context";
import { getMembersWithStatus } from "@/lib/queries";
import { getMonthlyRevenueTrend } from "@/lib/revenue";
import { formatCurrency, formatDate, initials } from "@/lib/utils";
import { daysUntil } from "@/lib/subscription";
import { PageHeader } from "@/components/page-header";
import { RevenueTrendChart } from "@/components/revenue-trend-chart";
import { StatusBadge } from "@/components/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

  return (
    <div>
      <PageHeader
        title={`Welcome back${user.name ? `, ${user.name.split(" ")[0]}` : ""}`}
        description="Here is what is happening at your gym."
      />

      <Suspense fallback={<DashboardSkeleton showFinancials={showFinancials} />}>
        <DashboardBody gymId={user.gymId} showFinancials={showFinancials} />
      </Suspense>
    </div>
  );
}

async function DashboardBody({
  gymId,
  showFinancials,
}: {
  gymId: string;
  showFinancials: boolean;
}) {
  const members = await getMembersWithStatus(gymId);

  const activeCount = members.filter(
    (m) => m.status === "ACTIVE" || m.status === "EXPIRING_SOON",
  ).length;
  const expiringSoon = members
    .filter((m) => m.status === "EXPIRING_SOON")
    .sort(
      (a, b) => (a.endDate?.getTime() ?? 0) - (b.endDate?.getTime() ?? 0),
    );
  const expiredCount = members.filter((m) => m.status === "EXPIRED").length;

  let monthRevenue = 0;
  let revenueTrend: Awaited<ReturnType<typeof getMonthlyRevenueTrend>> = [];
  if (showFinancials) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const [agg, trend] = await Promise.all([
      withTenant(gymId, (tx) =>
        tx.payment.aggregate({
          _sum: { amount: true },
          where: { gymId, paidAt: { gte: start, lt: end } },
        }),
      ),
      getMonthlyRevenueTrend(gymId),
    ]);
    monthRevenue = Number(agg._sum.amount ?? 0);
    revenueTrend = trend;
  }

  return (
    <>
      <div
        className={`grid gap-4 sm:grid-cols-2 ${showFinancials ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}
      >
        <StatCard
          title="Active members"
          value={String(activeCount)}
          icon={<Users className="h-5 w-5" />}
          hint={`${members.length} total members`}
        />

        {showFinancials ? (
          <StatCard
            title="Revenue this month"
            value={formatCurrency(monthRevenue)}
            icon={<TrendingUp className="h-5 w-5" />}
            hint="Payments recorded this month"
          />
        ) : null}

        <StatCard
          title="Expiring soon"
          value={String(expiringSoon.length)}
          icon={<CalendarClock className="h-5 w-5" />}
          hint="Ending within 7 days"
        />

        <StatCard
          title="Expired subscriptions"
          value={String(expiredCount)}
          icon={<AlertTriangle className="h-5 w-5" />}
          hint="Members who need to renew"
        />
      </div>

      {showFinancials ? (
        <Card className="mt-6">
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
          {expiringSoon.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No subscriptions expiring in the next 7 days.
            </p>
          ) : (
            <ul className="divide-y">
              {expiringSoon.map((m) => {
                const days = m.endDate ? daysUntil(m.endDate) : 0;
                return (
                  <li key={m.id}>
                    <Link
                      href={`/members/${m.id}`}
                      className="flex items-center justify-between gap-4 py-3 transition-colors hover:bg-accent/50"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{initials(m.name)}</AvatarFallback>
                        </Avatar>
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

function DashboardSkeleton({ showFinancials }: { showFinancials: boolean }) {
  const cardCount = showFinancials ? 4 : 3;
  return (
    <div className="animate-pulse">
      <div
        className={`grid gap-4 sm:grid-cols-2 ${showFinancials ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}
      >
        {Array.from({ length: cardCount }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="h-12 w-12 rounded-xl bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-24 rounded bg-muted" />
                <div className="h-6 w-16 rounded bg-muted" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {showFinancials ? (
        <Card className="mt-6">
          <CardHeader>
            <div className="h-5 w-36 rounded bg-muted" />
            <div className="mt-2 h-4 w-64 rounded bg-muted" />
          </CardHeader>
          <CardContent>
            <div className="h-[280px] rounded-lg bg-muted/50" />
          </CardContent>
        </Card>
      ) : null}
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

const STAT_ICON_CLASSES = "bg-muted text-muted-foreground";

function StatCard({
  title,
  value,
  icon,
  hint,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl ${STAT_ICON_CLASSES}`}
        >
          {icon}
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="font-mono text-2xl font-bold tracking-tight text-foreground">
            {value}
          </p>
          {hint ? (
            <p className="text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
