import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { requireGym } from "@/lib/session";
import { canLogPayments, canViewFinancials } from "@/lib/permissions";
import { withTenant } from "@/lib/db-context";
import { getPendingMembers, type PendingMember } from "@/lib/queries";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { PaymentDialog } from "@/components/payment-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const METHOD_LABEL: Record<string, string> = {
  CASH: "Cash",
  UPI: "UPI",
  CARD: "Card",
  BANK_TRANSFER: "Bank transfer",
  OTHER: "Other",
};

export default async function PaymentsPage() {
  const user = await requireGym();
  if (!canLogPayments(user.role)) redirect("/");

  const showFinancialReports = canViewFinancials(user.role);

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
  gymId,
  showFinancialReports,
}: {
  gymId: string;
  showFinancialReports: boolean;
}) {
  const pending = await getPendingMembers(gymId);

  if (!showFinancialReports) {
    return <PendingDuesCard pending={pending} />;
  }

  const payments = await withTenant(gymId, (tx) =>
    tx.payment.findMany({
      where: { gymId },
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
    <Tabs defaultValue="paid">
      <TabsList>
        <TabsTrigger value="paid">Paid ({payments.length})</TabsTrigger>
        <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="paid">
        <Card>
          <CardHeader>
            <CardTitle>Completed payments</CardTitle>
            <CardDescription>
              {formatCurrency(totalCollected)} collected across{" "}
              {payments.length} payment{payments.length === 1 ? "" : "s"}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No payments recorded yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>For</TableHead>
                    <TableHead>Logged by</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono">
                        {formatDate(p.paidAt)}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/members/${p.member.id}`}
                          className="font-medium hover:underline"
                        >
                          {p.member.name}
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono font-medium">
                        {formatCurrency(Number(p.amount))}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {METHOD_LABEL[p.method] ?? p.method}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {p.subscription?.package.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {p.recordedBy?.name ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="pending">
        <PendingDuesCard pending={pending} />
      </TabsContent>
    </Tabs>
  );
}

function PendingDuesCard({ pending }: { pending: PendingMember[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending dues</CardTitle>
        <CardDescription>
          Members with an outstanding balance on their current subscription.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {pending.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Everyone is paid up. Nothing pending.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Subs amount</TableHead>
                <TableHead>Paid amount</TableHead>
                <TableHead>Pending</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.map((m) => (
                <TableRow key={m.memberId}>
                  <TableCell>
                    <Link
                      href={`/members/${m.memberId}`}
                      className="font-medium hover:underline"
                    >
                      {m.memberName}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono">{m.phone}</TableCell>
                  <TableCell>
                    {m.packageName ?? (
                      <span className="text-muted-foreground">No package</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={m.status} />
                  </TableCell>
                  <TableCell className="font-mono">
                    {formatCurrency(m.subsAmount)}
                  </TableCell>
                  <TableCell className="font-mono">
                    {formatCurrency(m.paidAmount)}
                  </TableCell>
                  <TableCell className="font-mono font-medium text-status-expiring">
                    {formatCurrency(m.amountDue)}
                  </TableCell>
                  <TableCell className="text-right">
                    <PaymentDialog
                      memberId={m.memberId}
                      memberName={m.memberName}
                      subscriptionId={m.subscriptionId}
                      defaultAmount={m.amountDue}
                      balanceInfo={{
                        subsAmount: m.subsAmount,
                        paidAmount: m.paidAmount,
                        pendingAmount: m.amountDue,
                      }}
                      triggerVariant="outline"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
