import { Suspense } from "react";
import { redirect } from "next/navigation";

import { requireGym } from "@/lib/session";
import { canLogPayments, canViewFinancials } from "@/lib/permissions";
import { withTenant } from "@/lib/db-context";
import {
  getPendingDuesPage,
  getPendingDuesSummary,
  PENDING_DUES_PAGE_SIZE,
} from "@/lib/pending-dues-queries";
import { PageHeader } from "@/components/page-header";
import { PaymentsTabs, PendingDuesOnly } from "@/components/payments-tabs";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams?: { tab?: string; page?: string; q?: string };
}) {
  const user = await requireGym();
  if (!canLogPayments(user.role)) redirect("/");

  const showFinancialReports = canViewFinancials(user.role);
  const defaultTab =
    searchParams?.tab === "pending" || !showFinancialReports
      ? ("pending" as const)
      : ("paid" as const);
  const page = Number(searchParams?.page ?? "1");
  const q = searchParams?.q ?? "";

  return (
    <div>
      <PageHeader
        title={showFinancialReports ? "Payments" : "Pending dues"}
        description={
          showFinancialReports
            ? "Track completed payments and members with dues."
            : "Members with outstanding balances on any subscription cycle, including prior periods after renewal."
        }
      />

      <Suspense
        fallback={
          <PaymentsSkeleton showFinancialReports={showFinancialReports} />
        }
      >
        <PaymentsBody
          gymId={user.gymId}
          showFinancialReports={showFinancialReports}
          defaultTab={defaultTab}
          page={page}
          q={q}
        />
      </Suspense>
    </div>
  );
}

function PaymentsSkeleton({
  showFinancialReports,
}: {
  showFinancialReports: boolean;
}) {
  return (
    <div className="animate-pulse space-y-4">
      {showFinancialReports ? (
        <div className="h-9 w-48 rounded bg-muted" />
      ) : null}
      <Card>
        <CardHeader>
          <div className="h-5 w-40 rounded bg-muted" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 rounded bg-muted" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

async function PaymentsBody({
  gymId: tenantGymId,
  showFinancialReports,
  defaultTab,
  page,
  q,
}: {
  gymId: string;
  showFinancialReports: boolean;
  defaultTab: "paid" | "pending";
  page: number;
  q: string;
}) {
  const loadPending = defaultTab === "pending" || !showFinancialReports;

  if (!showFinancialReports) {
    const pendingResult = await getPendingDuesPage(tenantGymId, {
      page,
      pageSize: PENDING_DUES_PAGE_SIZE,
      q,
    });
    return (
      <PendingDuesOnly
        pending={pendingResult.rows}
        page={pendingResult.page}
        pageSize={pendingResult.pageSize}
        matchingCount={pendingResult.matchingCount}
        query={q}
      />
    );
  }

  if (loadPending) {
    const [pendingResult, paymentCount] = await Promise.all([
      getPendingDuesPage(tenantGymId, {
        page,
        pageSize: PENDING_DUES_PAGE_SIZE,
        q,
      }),
      withTenant(tenantGymId, (tx) =>
        tx.payment.count({ where: { gymId: tenantGymId } }),
      ),
    ]);
    return (
      <PaymentsTabs
        defaultTab="pending"
        payments={[]}
        pending={pendingResult.rows}
        pendingCount={pendingResult.unpaidCycleCount}
        paymentCount={paymentCount}
        totalCollected={0}
        page={pendingResult.page}
        pageSize={pendingResult.pageSize}
        matchingCount={pendingResult.matchingCount}
        query={q}
      />
    );
  }

  const [payments, pendingSummary] = await Promise.all([
    withTenant(tenantGymId, (tx) =>
      tx.payment.findMany({
        where: { gymId: tenantGymId },
        orderBy: { paidAt: "desc" },
        include: {
          member: { select: { id: true, name: true } },
          subscription: { include: { package: { select: { name: true } } } },
          recordedBy: { select: { name: true } },
        },
      }),
    ),
    getPendingDuesSummary(tenantGymId),
  ]);

  const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <PaymentsTabs
      defaultTab="paid"
      payments={payments}
      pending={[]}
      pendingCount={pendingSummary.unpaidCycleCount}
      paymentCount={payments.length}
      totalCollected={totalCollected}
      page={1}
      pageSize={PENDING_DUES_PAGE_SIZE}
      matchingCount={0}
      query=""
    />
  );
}
