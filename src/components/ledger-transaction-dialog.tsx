"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import type { LedgerTransactionType } from "@prisma/client";

import {
  createLedgerTransaction,
  updateLedgerTransaction,
} from "@/app/actions/ledger";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGuardedFormAction } from "@/hooks/use-guarded-form-action";
import type { ActionResult } from "@/lib/action-result";
import type { LedgerTransactionInput } from "@/lib/ledger";

function toDateInputValue(value: string): string {
  return value.slice(0, 10);
}

function todayDateInputValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving..." : label}
    </Button>
  );
}

export function LedgerTransactionDialog({
  transaction,
  trigger,
}: {
  transaction?: LedgerTransactionInput;
  trigger?: React.ReactNode;
}) {
  const isEdit = Boolean(transaction);
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const [type, setType] = React.useState<LedgerTransactionType>(
    transaction?.type ?? "EXPENSE",
  );

  const action = isEdit ? updateLedgerTransaction : createLedgerTransaction;
  const guardedAction = useGuardedFormAction(action);
  const [state, formAction] = useFormState<ActionResult | undefined, FormData>(
    guardedAction,
    undefined,
  );

  React.useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message ?? "Saved.");
      setOpen(false);
      router.refresh();
    } else {
      toast.error(state.error);
    }
  }, [state, router]);

  React.useEffect(() => {
    if (open && transaction) {
      setType(transaction.type);
    } else if (open && !transaction) {
      setType("EXPENSE");
    }
  }, [open, transaction]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ??
          (isEdit ? (
            <Button variant="outline" size="sm" className="gap-1">
              <Pencil className="h-4 w-4" /> Edit
            </Button>
          ) : (
            <Button className="gap-1">
              <Plus className="h-4 w-4" /> Add transaction
            </Button>
          ))}
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="space-y-4">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Edit transaction" : "Log transaction"}
            </DialogTitle>
            <DialogDescription>
              Record business income or expense (rent, salary, equipment, etc.).
              Member payments are included in Income automatically from Payments.
            </DialogDescription>
          </DialogHeader>

          {transaction ? (
            <input type="hidden" name="id" value={transaction.id} />
          ) : null}
          <input type="hidden" name="type" value={type} />

          <div className="space-y-2">
            <Label htmlFor="ledger-type">Type</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as LedgerTransactionType)}
            >
              <SelectTrigger id="ledger-type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INCOME">Income</SelectItem>
                <SelectItem value="EXPENSE">Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ledger-category">Category</Label>
            <Input
              id="ledger-category"
              name="category"
              defaultValue={transaction?.category}
              placeholder="Rent, Salary, Equipment…"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ledger-amount">Amount</Label>
            <Input
              id="ledger-amount"
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              defaultValue={transaction?.amount}
              placeholder="0.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ledger-occurredOn">Date</Label>
            <Input
              id="ledger-occurredOn"
              name="occurredOn"
              type="date"
              defaultValue={
                transaction
                  ? toDateInputValue(transaction.occurredOn)
                  : todayDateInputValue()
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ledger-note">Note (optional)</Label>
            <Textarea
              id="ledger-note"
              name="note"
              defaultValue={transaction?.note ?? ""}
              placeholder="Additional details"
            />
          </div>

          <DialogFooter>
            <SubmitButton label={isEdit ? "Save changes" : "Add transaction"} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
