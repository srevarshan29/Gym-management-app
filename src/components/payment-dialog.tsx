"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CreditCard } from "lucide-react";

import { logPayment, type LogPaymentData } from "@/app/actions/payments";
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
import { ReceiptModal } from "@/components/receipt-modal";
import type { ActionResult } from "@/lib/action-result";
import { formatCurrency } from "@/lib/utils";

export function PaymentDialog({
  memberId,
  memberName,
  subscriptionId,
  defaultAmount,
  balanceInfo,
  triggerLabel = "Log payment",
  triggerVariant = "default",
}: {
  memberId: string;
  memberName: string;
  subscriptionId?: string | null;
  defaultAmount?: number | null;
  balanceInfo?: {
    subsAmount: number;
    paidAmount: number;
    pendingAmount: number;
  } | null;
  triggerLabel?: string;
  triggerVariant?: "default" | "outline" | "secondary";
}) {
  const [open, setOpen] = React.useState(false);
  const [method, setMethod] = React.useState("CASH");
  const [receiptPaymentId, setReceiptPaymentId] = React.useState<string | null>(
    null,
  );
  const router = useRouter();

  const [state, formAction] = useFormState<
    ActionResult<LogPaymentData> | undefined,
    FormData
  >(logPayment, undefined);

  React.useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message ?? "Payment recorded.");
      setOpen(false);
      router.refresh();
      if (state.data?.paymentId) setReceiptPaymentId(state.data.paymentId);
    } else {
      toast.error(state.error);
    }
  }, [state, router]);

  const suggestedAmount =
    defaultAmount ??
    (balanceInfo && balanceInfo.pendingAmount > 0
      ? balanceInfo.pendingAmount
      : balanceInfo?.subsAmount);

  return (
    <>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size="sm" className="gap-1">
          <CreditCard className="h-4 w-4" /> {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
            <DialogDescription>
              Log a payment collected from {memberName}. Partial amounts are
              allowed and accumulate toward the subscription total.
            </DialogDescription>
          </DialogHeader>

          <input type="hidden" name="memberId" value={memberId} />
          {subscriptionId ? (
            <input type="hidden" name="subscriptionId" value={subscriptionId} />
          ) : null}
          <input type="hidden" name="method" value={method} />

          {balanceInfo ? (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <div className="grid gap-2 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Subs amount</p>
                  <p className="font-mono font-medium">
                    {formatCurrency(balanceInfo.subsAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Paid so far</p>
                  <p className="font-mono font-medium">
                    {formatCurrency(balanceInfo.paidAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pending</p>
                  <p className="font-mono font-medium text-status-expiring">
                    {formatCurrency(balanceInfo.pendingAmount)}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pay-amount">Amount (INR)</Label>
              <Input
                id="pay-amount"
                name="amount"
                type="number"
                min="0"
                step="0.01"
                defaultValue={suggestedAmount ?? undefined}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="CARD">Card</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank transfer</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pay-date">Payment date (optional)</Label>
            <Input id="pay-date" name="paidAt" type="date" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pay-note">Note (optional)</Label>
            <Textarea id="pay-note" name="note" placeholder="Reference / remarks" />
          </div>

          <DialogFooter>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <ReceiptModal
      paymentId={receiptPaymentId}
      onOpenChange={(o) => {
        if (!o) setReceiptPaymentId(null);
      }}
    />
    </>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving..." : "Record payment"}
    </Button>
  );
}
