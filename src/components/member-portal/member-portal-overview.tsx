import { MembershipProgressRing } from "@/components/member-portal/membership-progress-ring";
import { MemberPortalStatCard } from "@/components/member-portal/member-portal-stat-card";
import { StatusBadge } from "@/components/status-badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { MemberPortalOverview } from "@/lib/member-portal/queries";
import { formatCurrency, formatDate } from "@/lib/utils";

export function MemberPortalOverviewPanel({
  overview,
}: {
  overview: MemberPortalOverview;
}) {
  const hasSubscription = overview.packageName != null;

  if (!hasSubscription) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-xl font-bold">
          Hi, {overview.memberName}
        </h1>
        <Card className="rounded-2xl border-0 bg-card/90 shadow-soft ring-1 ring-border/70">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">
              No active subscription on file. Contact your gym front desk.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const daysRemaining = overview.daysRemaining ?? 0;
  const planTotalDays = overview.planTotalDays ?? 1;
  const displayDays = Math.max(0, daysRemaining);
  const percentRemaining = Math.min(
    100,
    Math.max(0, Math.round((displayDays / Math.max(1, planTotalDays)) * 100)),
  );
  const paidAmount = overview.paidAmount ?? 0;
  const pendingAmount = overview.pendingAmount ?? 0;
  const fullyPaid = pendingAmount <= 0;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <h1 className="font-display text-xl font-bold">
          Hi, {overview.memberName}
        </h1>
        <StatusBadge status={overview.status} className="shrink-0" />
      </div>

      <Card className="rounded-2xl border-0 bg-card/90 shadow-soft ring-1 ring-border/70 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">
            {overview.packageName}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3 pb-6 pt-0">
          {planTotalDays > 0 ? (
            <MembershipProgressRing
              daysRemaining={daysRemaining}
              planTotalDays={planTotalDays}
            />
          ) : (
            <p className="font-mono text-2xl font-bold">
              {displayDays} days left
            </p>
          )}
          <p className="text-center text-sm text-muted-foreground">
            {percentRemaining}% of plan remaining
            {overview.endDate ? (
              <>
                {" "}
                · ends {formatDate(overview.endDate)}
              </>
            ) : null}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <MemberPortalStatCard
          label="Paid"
          value={formatCurrency(paidAmount)}
          valueClassName={fullyPaid ? "text-primary" : "text-foreground"}
        />
        <MemberPortalStatCard
          label="Pending"
          value={formatCurrency(pendingAmount)}
          valueClassName={
            pendingAmount > 0 ? "text-destructive" : "text-foreground"
          }
        />
      </div>
    </div>
  );
}
