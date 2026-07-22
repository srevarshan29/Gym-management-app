import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, Pencil, Phone } from "lucide-react";

import { requireGym } from "@/lib/session";
import { canViewFinancials, canDeleteMembers, canLogPayments } from "@/lib/permissions";
import { withTenant } from "@/lib/db-context";
import { getMemberDetail } from "@/lib/queries";
import { durationLabel, statusFromEndDate } from "@/lib/subscription";
import {
  computeSubscriptionBalance,
  sumPaymentAmounts,
} from "@/lib/subscription-balance";
import { cn, formatCurrency, formatDate, initials } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { PendingDuesBadge, StatusBadge } from "@/components/status-badge";
import { RenewDialog } from "@/components/renew-dialog";
import { PaymentDialog } from "@/components/payment-dialog";
import { DeleteMemberButton } from "@/components/delete-member-button";
import { AutoOpenReceipt } from "@/components/auto-open-receipt";
import type { PackageOption } from "@/components/member-form";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

export default async function MemberProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireGym();
  const showFinancials = canViewFinancials(user.role);
  const canLog = canLogPayments(user.role);
  const canDelete = canDeleteMembers(user.role);

  const member = await getMemberDetail(user.gymId, params.id);
  if (!member) notFound();

  const current = [...member.subscriptions].sort(
    (a, b) => b.endDate.getTime() - a.endDate.getTime(),
  )[0];
  const status = statusFromEndDate(current?.endDate);
  const currentBalance = current
    ? computeSubscriptionBalance(
        Number(current.priceAtPurchase),
        sumPaymentAmounts(current.payments),
      )
    : null;
  const firstSubscription = [...member.subscriptions].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  )[0];
  const addedByName = firstSubscription?.createdBy?.name ?? null;

  const packages = await withTenant(user.gymId, (tx) =>
    tx.package.findMany({
      where: { gymId: user.gymId, isActive: true },
      orderBy: { name: "asc" },
    }),
  );
  const options: PackageOption[] = packages.map((p) => ({
    id: p.id,
    name: p.name,
    price: Number(p.price),
    durationLabel: durationLabel(p.durationValue, p.durationUnit),
  }));

  return (
    <div className="mx-auto max-w-4xl">
      {showFinancials ? <AutoOpenReceipt /> : null}
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link href="/members">
            <ArrowLeft className="h-4 w-4" /> Back to members
          </Link>
        </Button>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14 text-lg">
            <AvatarFallback>{initials(member.name)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl font-bold tracking-tight">
                {member.name}
              </h1>
              <StatusBadge status={status} />
              {currentBalance && currentBalance.pendingAmount > 0 ? (
                <PendingDuesBadge />
              ) : null}
            </div>
            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-mono">#{String(member.memberNumber).padStart(4, "0")}</span>
              <span className="flex items-center gap-1 font-mono">
                <Phone className="h-3.5 w-3.5" /> {member.phone}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <RenewDialog
            memberId={member.id}
            packages={options}
            canRecordPayment={canLog}
          />
          {canLog && current ? (
            <PaymentDialog
              memberId={member.id}
              memberName={member.name}
              subscriptionId={current.id}
              defaultAmount={currentBalance?.pendingAmount ?? undefined}
              balanceInfo={currentBalance}
              triggerVariant="outline"
            />
          ) : null}
          <Button asChild variant="outline" size="sm" className="gap-1">
            <Link href={`/members/${member.id}/edit`}>
              <Pencil className="h-4 w-4" /> Edit
            </Link>
          </Button>
          {canDelete ? (
            <DeleteMemberButton
              memberId={member.id}
              memberName={member.name}
            />
          ) : null}
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <Detail label="Current package" value={current?.package.name ?? "—"} />
            <Detail
              label="Expiry date"
              value={current ? formatDate(current.endDate) : "—"}
              mono
            />
            <Detail label="Member since" value={formatDate(member.createdAt)} mono />
            <Detail label="Added by" value={addedByName ?? "—"} />
            {canLog && currentBalance ? (
              <>
                <Detail
                  label="Subs amount"
                  value={formatCurrency(currentBalance.subsAmount)}
                  mono
                />
                <Detail
                  label="Paid amount"
                  value={formatCurrency(currentBalance.paidAmount)}
                  mono
                />
                <Detail
                  label="Pending"
                  value={formatCurrency(currentBalance.pendingAmount)}
                  mono
                />
              </>
            ) : null}
            {member.notes ? (
              <div className="sm:col-span-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Notes
                </p>
                <p className="mt-1 text-sm">{member.notes}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscription history</CardTitle>
            <CardDescription>
              {member.subscriptions.length} subscription
              {member.subscriptions.length === 1 ? "" : "s"}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {member.subscriptions.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No subscriptions recorded.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Package</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Added by</TableHead>
                    {showFinancials ? <TableHead>Price</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {member.subscriptions.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">
                        {s.package.name}
                      </TableCell>
                      <TableCell className="font-mono">{formatDate(s.startDate)}</TableCell>
                      <TableCell className="font-mono">{formatDate(s.endDate)}</TableCell>
                      <TableCell>
                        <StatusBadge status={statusFromEndDate(s.endDate)} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {s.createdBy?.name ?? "—"}
                      </TableCell>
                      {showFinancials ? (
                        <TableCell className="font-mono">
                          {formatCurrency(Number(s.priceAtPurchase))}
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {showFinancials ? (
          <Card>
            <CardHeader>
              <CardTitle>Payment history</CardTitle>
              <CardDescription>
                {member.payments.length} payment
                {member.payments.length === 1 ? "" : "s"} recorded.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {member.payments.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No payments recorded yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>For</TableHead>
                      <TableHead>Logged by</TableHead>
                      <TableHead className="text-right">Receipt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {member.payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono">{formatDate(p.paidAt)}</TableCell>
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
                        <TableCell className="text-right">
                          <Button asChild variant="outline" size="sm" className="gap-1">
                            <a href={`/payments/${p.id}/receipt?download=1`} download>
                              <Download className="h-3.5 w-3.5" /> Download
                            </a>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={cn("mt-1 text-sm font-medium", mono && "font-mono")}>
        {value}
      </p>
    </div>
  );
}
