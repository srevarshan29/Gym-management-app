import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/member-session";
import { getMemberPortalOverview } from "@/lib/member-portal/queries";
import { formatCurrency } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function MemberOverviewPage() {
  const session = await requireMember();
  const overview = await getMemberPortalOverview(
    session.gymId,
    session.memberId,
  );
  if (!overview) {
    return <p className="text-muted-foreground">Unable to load your account.</p>;
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-bold">Hi, {overview.memberName}</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Membership</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {overview.packageName ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Current plan</span>
                <span className="font-medium">{overview.packageName}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge status={overview.status} />
              </div>
              {overview.daysRemaining != null ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Days remaining</span>
                  <span className="font-mono font-medium">
                    {overview.daysRemaining < 0 ? 0 : overview.daysRemaining}
                  </span>
                </div>
              ) : null}
              {overview.pendingAmount != null && overview.pendingAmount > 0 ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Pending dues</span>
                  <span className="font-mono font-medium text-destructive">
                    {formatCurrency(overview.pendingAmount)}
                  </span>
                </div>
              ) : (
                <p className="text-muted-foreground">No pending dues on your current plan.</p>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">
              No active subscription on file. Contact your gym front desk.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
