"use client";

import { LockedLink } from "@/components/navigation/locked-link";
import { PackageDialog } from "@/components/package-dialog";
import { Button } from "@/components/ui/button";
import { BarChart3, CreditCard, Package, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

type DashboardQuickActionsProps = {
  canManageMembers: boolean;
  canLogPayments: boolean;
  canManagePackages: boolean;
  showFinancialReports?: boolean;
  className?: string;
};

export function DashboardQuickActions({
  canManageMembers,
  canLogPayments,
  canManagePackages,
  showFinancialReports = false,
  className,
}: DashboardQuickActionsProps) {
  const actions = [
    canManageMembers
      ? {
          key: "add-member",
          node: (
            <Button asChild size="sm" className="h-9 w-full gap-1.5 shadow-soft sm:w-auto">
              <LockedLink href="/members/new">
                <UserPlus className="h-4 w-4" />
                Add Member
              </LockedLink>
            </Button>
          ),
        }
      : null,
    canLogPayments
      ? {
          key: "record-payment",
          node: (
            <Button asChild size="sm" variant="outline" className="h-9 w-full gap-1.5 shadow-soft sm:w-auto">
              <LockedLink href="/payments">
                <CreditCard className="h-4 w-4" />
                Record Payment
              </LockedLink>
            </Button>
          ),
        }
      : null,
    canManagePackages
      ? {
          key: "create-package",
          node: (
            <PackageDialog
              trigger={
                <Button size="sm" variant="outline" className="h-9 w-full gap-1.5 shadow-soft sm:w-auto">
                  <Package className="h-4 w-4" />
                  Create Package
                </Button>
              }
            />
          ),
        }
      : null,
    showFinancialReports
      ? {
          key: "view-reports",
          node: (
            <Button asChild size="sm" variant="outline" className="h-9 w-full gap-1.5 shadow-soft sm:w-auto">
              <LockedLink href="/payments">
                <BarChart3 className="h-4 w-4" />
                View Reports
              </LockedLink>
            </Button>
          ),
        }
      : null,
  ].filter(Boolean) as { key: string; node: React.ReactNode }[];

  if (actions.length === 0) return null;

  return (
    <div
      className={cn(
        "grid w-full min-w-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end",
        className,
      )}
    >
      {actions.map((action) => (
        <div key={action.key} className="min-w-0 last:odd:col-span-2 sm:last:odd:col-span-1">
          {action.node}
        </div>
      ))}
    </div>
  );
}
