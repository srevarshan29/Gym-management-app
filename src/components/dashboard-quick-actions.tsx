"use client";

import Link from "next/link";
import { CreditCard, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DashboardQuickActionsProps = {
  canManageMembers: boolean;
  canLogPayments: boolean;
  className?: string;
};

export function DashboardQuickActions({
  canManageMembers,
  canLogPayments,
  className,
}: DashboardQuickActionsProps) {
  if (!canManageMembers && !canLogPayments) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-end gap-2",
        className,
      )}
    >
      {canManageMembers ? (
        <Button asChild size="sm" className="gap-1.5 shadow-soft">
          <Link href="/members/new">
            <UserPlus className="h-4 w-4" />
            Add Member
          </Link>
        </Button>
      ) : null}
      {canLogPayments ? (
        <Button asChild size="sm" variant="outline" className="gap-1.5 shadow-soft">
          <Link href="/payments">
            <CreditCard className="h-4 w-4" />
            Record Payment
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
