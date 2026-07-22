import { Badge } from "@/components/ui/badge";
import {
  STATUS_LABEL,
  statusFromEndDate,
  type SubscriptionStatus,
} from "@/lib/subscription";
import { cn } from "@/lib/utils";

const VARIANT: Record<
  SubscriptionStatus,
  "active" | "expiring" | "expired" | "secondary"
> = {
  ACTIVE: "active",
  EXPIRING_SOON: "expiring",
  EXPIRED: "expired",
  NONE: "secondary",
};

export function PendingDuesBadge({ className }: { className?: string }) {
  return (
    <Badge variant="expiring" className={cn(className)}>
      Pending dues
    </Badge>
  );
}

export function StatusBadge({
  status,
  className,
}: {
  status: SubscriptionStatus;
  className?: string;
}) {
  return (
    <Badge variant={VARIANT[status]} className={cn(className)}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}

/** Convenience wrapper that derives the status from an end date. */
export function StatusBadgeForDate({
  endDate,
  className,
}: {
  endDate: Date | string | null | undefined;
  className?: string;
}) {
  return (
    <StatusBadge status={statusFromEndDate(endDate)} className={className} />
  );
}
