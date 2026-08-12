"use client";

import { ArrowRight, CalendarClock, CalendarX2 } from "lucide-react";

import { LockedLink } from "@/components/navigation/locked-link";
import { MemberAvatar } from "@/components/member-avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MembershipRenewalRow } from "@/lib/queries";
import { daysUntil, expiredDaysAgoLabel } from "@/lib/subscription";
import { formatDate } from "@/lib/utils";

type DashboardRenewalPanelProps = {
  variant: "upcoming" | "expired";
  items: MembershipRenewalRow[];
  limit?: number;
};

export function DashboardRenewalPanel({
  variant,
  items,
  limit = 5,
}: DashboardRenewalPanelProps) {
  const isUpcoming = variant === "upcoming";
  const preview = items.slice(0, limit);
  const viewAllHref = isUpcoming ? "/renewals" : "/expired";
  const Icon = isUpcoming ? CalendarClock : CalendarX2;
  const iconClass = isUpcoming
    ? "text-[hsl(var(--status-expiring))]"
    : "text-[hsl(var(--status-expired))]";

  return (
    <Card className="rounded-2xl border-0 bg-card/90 shadow-soft ring-1 ring-border/70 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-4">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className={`h-5 w-5 ${iconClass}`} />
            {isUpcoming ? "Upcoming Renewals" : "Expired Memberships"}
          </CardTitle>
          <CardDescription>
            {isUpcoming
              ? "Members whose subscriptions expire within 7 days."
              : "Members with expired subscriptions who need to renew."}
          </CardDescription>
        </div>
        <LockedLink
          href={viewAllHref}
          className="shrink-0 text-sm font-medium text-primary hover:underline"
        >
          View all →
        </LockedLink>
      </CardHeader>
      <CardContent className="p-0 pb-2">
        {preview.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-muted-foreground">
            {isUpcoming
              ? "No subscriptions expiring in the next 7 days."
              : "No expired memberships."}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>{isUpcoming ? "Days left" : "Expired"}</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.map((item) => {
                const days = daysUntil(item.endDate);
                return (
                  <TableRow key={item.id}>
                    <TableCell className="min-w-[140px]">
                      <div className="flex items-center gap-2">
                        <MemberAvatar
                          name={item.name}
                          photoUrl={item.photoUrl}
                          gender={item.gender}
                          seed={item.id}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{item.name}</p>
                          <p className="font-mono text-xs text-muted-foreground">
                            #{String(item.memberNumber).padStart(4, "0")}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{item.packageName}</TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-sm">
                      {formatDate(item.endDate)}
                    </TableCell>
                    <TableCell>
                      {isUpcoming ? (
                        <span className="inline-flex rounded-full bg-[hsl(var(--status-expiring)/0.15)] px-2.5 py-0.5 text-xs font-medium text-[hsl(var(--status-expiring))]">
                          {days <= 0
                            ? "Today"
                            : `${days} day${days === 1 ? "" : "s"}`}
                        </span>
                      ) : (
                        <span className="text-sm text-[hsl(var(--status-expired))]">
                          {expiredDaysAgoLabel(item.endDate)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm" className="gap-1">
                        <LockedLink href={`/members/${item.id}`}>
                          View Profile
                          <ArrowRight className="h-3.5 w-3.5" />
                        </LockedLink>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
