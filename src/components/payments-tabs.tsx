"use client";

import * as React from "react";
import { LockedLink } from "@/components/navigation/locked-link";
import { Search } from "lucide-react";

import { PaymentDialog } from "@/components/payment-dialog";
import { StatusBadge } from "@/components/status-badge";
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
import { Input } from "@/components/ui/input";
import type { PendingMember } from "@/lib/queries";
import { formatCurrency, formatDate } from "@/lib/utils";

const METHOD_LABEL: Record<string, string> = {
  CASH: "Cash",
  UPI: "UPI",
  CARD: "Card",
  BANK_TRANSFER: "Bank transfer",
  OTHER: "Other",
};

type PaymentRow = {
  id: string;
  paidAt: Date;
  amount: unknown;
  method: string;
  member: { id: string; name: string };
  subscription: { package: { name: string } } | null;
  recordedBy: { name: string } | null;
};

function matchesPaymentSearch(payment: PaymentRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return payment.member.name.toLowerCase().includes(q);
}

function PaidPaymentsTable({
  payments,
  totalCollected,
}: {
  payments: PaymentRow[];
  totalCollected: number;
}) {
  const [query, setQuery] = React.useState("");
  const filtered = React.useMemo(
    () => payments.filter((p) => matchesPaymentSearch(p, query)),
    [payments, query],
  );

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by member name…"
          className="pl-9"
          aria-label="Search payments by member name"
        />
      </div>

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
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No payments match your search.
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
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono">
                      {formatDate(p.paidAt)}
                    </TableCell>
                    <TableCell>
                      <LockedLink
                        href={`/members/${p.member.id}`}
                        className="font-medium hover:underline"
                      >
                        {p.member.name}
                      </LockedLink>
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
    </div>
  );
}

export function PaymentsTabs({
  defaultTab,
  payments,
  pending,
  totalCollected,
}: {
  defaultTab: "paid" | "pending";
  payments: PaymentRow[];
  pending: PendingMember[];
  totalCollected: number;
}) {
  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList>
        <TabsTrigger value="paid">Paid ({payments.length})</TabsTrigger>
        <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="paid">
        <PaidPaymentsTable payments={payments} totalCollected={totalCollected} />
      </TabsContent>

      <TabsContent value="pending">
        <PendingDuesCard pending={pending} />
      </TabsContent>
    </Tabs>
  );
}

export function PendingDuesOnly({ pending }: { pending: PendingMember[] }) {
  return <PendingDuesCard pending={pending} />;
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
                    <LockedLink
                      href={`/members/${m.memberId}`}
                      className="font-medium hover:underline"
                    >
                      {m.memberName}
                    </LockedLink>
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
