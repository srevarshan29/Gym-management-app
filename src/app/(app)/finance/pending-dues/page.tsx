import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { requireGym } from "@/lib/session";
import { canViewMemberBalances } from "@/lib/permissions";
import { getPendingMembers } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { PendingDuesList } from "@/components/pending-dues-list";
import {
  FinancePendingDuesPageSkeleton,
  PageHeaderSkeleton,
} from "@/components/page-loading-skeletons";

export default async function PendingDuesPage() {
  const user = await requireGym();
  if (!canViewMemberBalances(user.role)) redirect("/");

  return (
    <Suspense fallback={<PendingDuesPageSkeleton />}>
      <PendingDuesPageContent gymId={user.gymId} />
    </Suspense>
  );
}

function PendingDuesPageSkeleton() {
  return (
    <div className="animate-pulse">
      <PageHeaderSkeleton />
      <FinancePendingDuesPageSkeleton />
    </div>
  );
}

async function PendingDuesPageContent({ gymId }: { gymId: string }) {
  const pending = await getPendingMembers(gymId);

  const items = pending.map((m) => ({
    memberId: m.memberId,
    memberNumber: m.memberNumber,
    memberName: m.memberName,
    phone: m.phone,
    photoUrl: m.photoUrl,
    gender: m.gender,
    packageName: m.packageName,
    amountDue: m.amountDue,
    endDate: m.endDate.toISOString(),
  }));

  const totalDue = pending.reduce((sum, m) => sum + m.amountDue, 0);

  return (
    <div>
      <PageHeader
        title="Pending Dues"
        description={
          pending.length === 0
            ? "No outstanding balances on current subscriptions."
            : `${pending.length} member${pending.length === 1 ? "" : "s"} owe ${formatCurrency(totalDue)} total. Sorted by highest balance first.`
        }
      />

      <p className="mb-4 text-sm text-muted-foreground">
        Log payments from a member profile, or use{" "}
        <Link href="/payments?tab=pending" className="text-primary hover:underline">
          Payments → Pending
        </Link>{" "}
        to record dues inline.
      </p>

      <PendingDuesList
        items={items}
        emptyMessage="Everyone is paid up. No pending dues on current subscriptions."
      />
    </div>
  );
}
