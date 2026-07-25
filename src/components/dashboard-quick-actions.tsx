"use client";

import Link from "next/link";
import { CreditCard, Package, RefreshCw, UserPlus } from "lucide-react";

import { PackageDialog } from "@/components/package-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DashboardQuickActionsProps = {
  canManageMembers: boolean;
  canLogPayments: boolean;
  canManagePackages: boolean;
  className?: string;
};

export function DashboardQuickActions({
  canManageMembers,
  canLogPayments,
  canManagePackages,
  className,
}: DashboardQuickActionsProps) {
  const actions = [
    canManageMembers
      ? {
          key: "add-member",
          label: "Add Member",
          icon: UserPlus,
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
          label: "Record Payment",
          icon: CreditCard,
          node: (
            <Button asChild size="sm" variant="secondary" className="gap-1.5 shadow-soft">
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
          label: "Create Package",
          icon: Package,
          node: (
            <PackageDialog
              trigger={
                <Button size="sm" variant="secondary" className="gap-1.5 shadow-soft">
                  <Package className="h-4 w-4" />
                  Create Package
                </Button>
              }
            />
          ),
        }
      : null,
    {
      key: "renew",
      label: "Renew Membership",
      icon: RefreshCw,
      node: (
        <Button asChild size="sm" variant="outline" className="gap-1.5 shadow-soft">
          <Link href="/renewals">
            <RefreshCw className="h-4 w-4" />
            Renew Membership
          </Link>
        </Button>
      ),
    },
  ].filter(Boolean) as {
    key: string;
    node: React.ReactNode;
  }[];

  if (actions.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        "fixed bottom-4 right-4 z-40",
        "md:static md:bottom-auto md:right-auto md:flex-row md:flex-wrap md:items-center md:justify-end",
        className,
      )}
    >
      {actions.map((a) => (
        <div key={a.key}>{a.node}</div>
      ))}
    </div>
  );
}
