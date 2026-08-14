import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { requireGym } from "@/lib/session";
import { canViewMemberBalances } from "@/lib/permissions";
import {
  getPendingDuesPage,
  PENDING_DUES_PAGE_SIZE,
} from "@/lib/pending-dues-queries";
import { formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { PendingDuesList } from "@/components/pending-dues-list";
import {
  FinancePendingDuesPageSkeleton,
  PageHeaderSkeleton,
} from "@/components/page-loading-skeletons";

export default async function PendingDuesPage({
  searchParams,
}: {
  searchParams?: { page?: string; q?: string };
}) {
  const user = await requireGym();
  if (!canViewMemberBalances(user.role)) redirect("/");

  const page = Number(searchParams?.page ?? "1");
  const q = searchParams?.q ?? "";

  return (
    <Suspense fallback={<PendingDuesPageSkeleton />}>
      <PendingDuesPageContent gymId={user.gymId} page={page} q={q} />
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

function pendingDuesHref(page: number, q: string): string {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (q.trim()) params.set("q", q.trim());
  const qs = params.toString();
  return qs ? `/finance/pending-dues?${qs}` : "/finance/pending-dues";
}

async function PendingDuesPageContent({
  gymId,
  page,
  q,
}: {
  gymId: string;
  page: number;
  q: string;
}) {
  const result = await getPendingDuesPage(gymId, {
    page,
    pageSize: PENDING_DUES_PAGE_SIZE,
    q,
  });

  const items = result.rows.map((m) => ({
    memberId: m.memberId,
    memberNumber: m.memberNumber,
    memberName: m.memberName,
    phone: m.phone,
    photoUrl: m.photoUrl,
    gender: m.gender,
    packageName: m.packageName,
    amountDue: m.amountDue,
    endDate: m.endDate.toISOString(),
    subscriptionId: m.subscriptionId,
  }));

  return (
    <div>
      <PageHeader
        title="Pending Dues"
        description={
          result.unpaidCycleCount === 0
            ? "No outstanding subscription balances."
            : `${result.unpaidCycleCount} unpaid cycle${result.unpaidCycleCount === 1 ? "" : "s"} totaling ${formatCurrency(result.totalDue)}. Includes prior periods after renewal.`
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
        emptyMessage="Everyone is paid up. No pending dues."
        query={q}
        page={result.page}
        pageSize={result.pageSize}
        matchingCount={result.matchingCount}
        makeHref={pendingDuesHref}
        searchAction="/finance/pending-dues"
      />
    </div>
  );
}
