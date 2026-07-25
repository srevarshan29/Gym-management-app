import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type DashboardAlertsProps = {
  expiredCount: number;
  expiringSoonCount: number;
  pendingCount: number;
  showPending: boolean;
};

export function DashboardAlerts({
  expiredCount,
  expiringSoonCount,
  pendingCount,
  showPending,
}: DashboardAlertsProps) {
  const hasAlerts =
    expiredCount > 0 ||
    expiringSoonCount > 0 ||
    (showPending && pendingCount > 0);

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Attention required</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasAlerts ? (
          <p className="text-sm text-muted-foreground">
            Nothing needs attention right now.
          </p>
        ) : (
          <div className="flex flex-wrap gap-3">
            <AlertChip
              href="/expired"
              label="Expired memberships"
              count={expiredCount}
              emoji="🔴"
              badgeClassName="bg-[hsl(var(--status-expired))] text-[hsl(var(--status-expired-foreground))]"
            />
            <AlertChip
              href="/renewals"
              label="Expiring within 7 days"
              count={expiringSoonCount}
              emoji="🟡"
              badgeClassName="bg-[hsl(var(--status-expiring))] text-[hsl(var(--status-expiring-foreground))]"
            />
            {showPending ? (
              <AlertChip
                href="/payments?tab=pending"
                label="Pending payments"
                count={pendingCount}
                emoji="💰"
                badgeClassName="bg-amber-500/90 text-white"
              />
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AlertChip({
  href,
  label,
  count,
  emoji,
  badgeClassName,
}: {
  href: string;
  label: string;
  count: number;
  emoji: string;
  badgeClassName: string;
}) {
  if (count === 0) return null;

  return (
    <Link
      href={href}
      className={cn(
        "hover-lift flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm",
        "transition-[transform,box-shadow]",
      )}
    >
      <span aria-hidden>{emoji}</span>
      <span className="font-medium">{label}</span>
      <Badge className={cn("font-mono tabular-nums", badgeClassName)}>
        {count}
      </Badge>
    </Link>
  );
}
