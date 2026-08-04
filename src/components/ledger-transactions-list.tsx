"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteLedgerTransaction } from "@/app/actions/ledger";
import { LedgerTransactionDialog } from "@/components/ledger-transaction-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LedgerTransactionInput } from "@/lib/ledger";
import { formatCurrency, formatDate } from "@/lib/utils";

type LedgerTransactionsListProps = {
  transactions: LedgerTransactionInput[];
};

function matchesSearch(tx: LedgerTransactionInput, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    tx.category.toLowerCase().includes(q) ||
    (tx.note?.toLowerCase().includes(q) ?? false)
  );
}

function DeleteLedgerButton({
  id,
  label,
}: {
  id: string;
  label: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const router = useRouter();

  function onDelete() {
    startTransition(async () => {
      const result = await deleteLedgerTransaction(id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Transaction removed.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1 text-destructive">
          <Trash2 className="h-4 w-4" /> Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete transaction</DialogTitle>
          <DialogDescription>
            Remove {label}? This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button variant="destructive" onClick={onDelete} disabled={pending}>
            {pending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function LedgerTransactionsList({
  transactions,
}: LedgerTransactionsListProps) {
  const [query, setQuery] = React.useState("");
  const filtered = React.useMemo(
    () => transactions.filter((tx) => matchesSearch(tx, query)),
    [transactions, query],
  );

  return (
    <div className="space-y-4">
      <div className="relative w-full max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by category or note…"
          className="pl-9"
          aria-label="Search transactions"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No manual transactions yet. Click &quot;Add transaction&quot; to log
              rent, salaries, equipment, or other income and expenses.
            </p>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No transactions match your search.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((tx) => (
                  <TableRow key={tx.id} className="hover-lift-row">
                    <TableCell className="px-3 py-3">
                      <Badge
                        variant="secondary"
                        className={
                          tx.type === "INCOME"
                            ? "border-primary/30 bg-primary/10 text-primary"
                            : "border-[hsl(var(--status-expired)/0.35)] bg-[hsl(var(--status-expired)/0.12)] text-[hsl(var(--status-expired))]"
                        }
                      >
                        {tx.type === "INCOME" ? "Income" : "Expense"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-3 py-3 font-medium">
                      {tx.category}
                    </TableCell>
                    <TableCell
                      className={`whitespace-nowrap px-3 py-3 font-mono font-medium ${
                        tx.type === "INCOME"
                          ? "text-primary"
                          : "text-[hsl(var(--status-expired))]"
                      }`}
                    >
                      {tx.type === "EXPENSE" ? "−" : ""}
                      {formatCurrency(tx.amount)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-3 font-mono">
                      {formatDate(tx.occurredOn)}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate px-3 py-3 text-muted-foreground">
                      {tx.note ?? "—"}
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <LedgerTransactionDialog transaction={tx} />
                        <DeleteLedgerButton
                          id={tx.id}
                          label={`${tx.category} (${formatCurrency(tx.amount)})`}
                        />
                      </div>
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
