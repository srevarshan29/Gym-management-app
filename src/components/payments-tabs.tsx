"use client";

import * as React from "react";
import { LockedLink } from "@/components/navigation/locked-link";
import { PaginationBar } from "@/components/pagination-bar";
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
            <Table className="min-w-[40rem]">
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
  pendingCount,
  paymentCount,
  totalCollected,
  page,
  pageSize,
  matchingCount,
  query,
}: {
  defaultTab: "paid" | "pending";
  payments: PaymentRow[];
  pending: PendingMember[];
  pendingCount: number;
  paymentCount: number;
  totalCollected: number;
  page: number;
  pageSize: number;
  matchingCount: number;
  query: string;
}) {
  return (
    <Tabs value={defaultTab}>
      <TabsList>
        <TabsTrigger value="paid" asChild>
          <LockedLink href="/payments?tab=paid">Paid ({paymentCount})</LockedLink>
        </TabsTrigger>
        <TabsTrigger value="pending" asChild>
          <LockedLink href="/payments?tab=pending">
            Pending ({pendingCount})
          </LockedLink>
        </TabsTrigger>
      </TabsList>

      {defaultTab === "paid" ? (
        <TabsContent value="paid">
          <PaidPaymentsTable payments={payments} totalCollected={totalCollected} />
        </TabsContent>
      ) : (
        <TabsContent value="pending">
          <PendingDuesCard
            pending={pending}
            page={page}
            pageSize={pageSize}
            matchingCount={matchingCount}
            query={query}
            searchAction="/payments"
            extraSearchFields={{ tab: "pending" }}
            makeHref={(nextPage, q) => {
              const params = new URLSearchParams({ tab: "pending" });
              if (nextPage > 1) params.set("page", String(nextPage));
              if (q.trim()) params.set("q", q.trim());
              return `/payments?${params.toString()}`;
            }}
          />
        </TabsContent>
      )}
    </Tabs>
  );
}

export function PendingDuesOnly({
  pending,
  page,
  pageSize,
  matchingCount,
  query,
}: {
  pending: PendingMember[];
  page: number;
  pageSize: number;
  matchingCount: number;
  query: string;
}) {
  return (
    <PendingDuesCard
      pending={pending}
      page={page}
      pageSize={pageSize}
      matchingCount={matchingCount}
      query={query}
      searchAction="/payments"
      extraSearchFields={{ tab: "pending" }}
      makeHref={(nextPage, q) => {
        const params = new URLSearchParams({ tab: "pending" });
        if (nextPage > 1) params.set("page", String(nextPage));
        if (q.trim()) params.set("q", q.trim());
        return `/payments?${params.toString()}`;
      }}
    />
  );
}

function PendingDuesCard({
  pending,
  page,
  pageSize,
  matchingCount,
  query,
  searchAction,
  extraSearchFields,
  makeHref,
}: {
  pending: PendingMember[];
  page: number;
  pageSize: number;
  matchingCount: number;
  query: string;
  searchAction: string;
  extraSearchFields?: Record<string, string>;
  makeHref: (page: number, q: string) => string;
}) {
  return (
    <div className="space-y-4">
      <form action={searchAction} className="relative max-w-md">
        {extraSearchFields
          ? Object.entries(extraSearchFields).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))
          : null}
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search by member name…"
          className="pl-9"
          aria-label="Search members by name"
        />
      </form>
      <Card>
        <CardHeader>
          <CardTitle>Pending dues</CardTitle>
          <CardDescription>
            Members with an outstanding balance on any subscription cycle,
            including prior periods after renewal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {matchingCount === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {query.trim()
                ? "No members match your search."
                : "Everyone is paid up. Nothing pending."}
            </p>
          ) : (
            <Table className="min-w-[48rem]">
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
                  <TableRow key={m.subscriptionId}>
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
      <PaginationBar
        page={page}
        pageSize={pageSize}
        total={matchingCount}
        makeHref={(nextPage) => makeHref(nextPage, query)}
      />
    </div>
  );
}
