import { Suspense } from "react";
import { redirect } from "next/navigation";

import { requireGym } from "@/lib/session";
import { canLogPayments, canViewFinancials } from "@/lib/permissions";
import { withTenant } from "@/lib/db-context";
import { getPendingMembers } from "@/lib/queries";
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
  searchParams?: { tab?: string };
}) {
  const user = await requireGym();
  if (!canLogPayments(user.role)) redirect("/");

  const showFinancialReports = canViewFinancials(user.role);
  const defaultTab =
    searchParams?.tab === "pending" ? ("pending" as const) : ("paid" as const);

  return (
    <div>
      <PageHeader
        title={showFinancialReports ? "Payments" : "Pending dues"}
        description={
          showFinancialReports
            ? "Track completed payments and members with dues."
            : "Members with outstanding balances on their current subscription."
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
}: {
  gymId: string;
  showFinancialReports: boolean;
  defaultTab: "paid" | "pending";
}) {
  const pending = await getPendingMembers(tenantGymId);

  if (!showFinancialReports) {
    return <PendingDuesOnly pending={pending} />;
  }

  const payments = await withTenant(tenantGymId, (tx) =>
    tx.payment.findMany({
      where: { gymId: tenantGymId },
      orderBy: { paidAt: "desc" },
      include: {
        member: { select: { id: true, name: true } },
        subscription: { include: { package: { select: { name: true } } } },
        recordedBy: { select: { name: true } },
      },
    }),
  );

  const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <PaymentsTabs
      defaultTab={defaultTab}
      payments={payments}
      pending={pending}
      totalCollected={totalCollected}
    />
  );
}
