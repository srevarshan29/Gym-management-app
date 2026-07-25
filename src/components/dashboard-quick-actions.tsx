"use client";

import Link from "next/link";
import { BarChart3, CreditCard, Package, UserPlus } from "lucide-react";

import { PackageDialog } from "@/components/package-dialog";
import { Button } from "@/components/ui/button";
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
            <Button asChild size="sm" className="gap-1.5 shadow-soft">
              <Link href="/members/new">
                <UserPlus className="h-4 w-4" />
                Add Member
              </Link>
            </Button>
          ),
        }
      : null,
    canLogPayments
      ? {
          key: "record-payment",
          node: (
            <Button asChild size="sm" variant="outline" className="gap-1.5 shadow-soft">
              <Link href="/payments">
                <CreditCard className="h-4 w-4" />
                Record Payment
              </Link>
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
                <Button size="sm" variant="outline" className="gap-1.5 shadow-soft">
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
            <Button asChild size="sm" variant="outline" className="gap-1.5 shadow-soft">
              <Link href="/payments">
                <BarChart3 className="h-4 w-4" />
                View Reports
              </Link>
            </Button>
          ),
        }
      : null,
  ].filter(Boolean) as { key: string; node: React.ReactNode }[];

  if (actions.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-end gap-2",
        className,
      )}
    >
      {actions.map((action) => (
        <div key={action.key}>{action.node}</div>
      ))}
    </div>
  );
}
