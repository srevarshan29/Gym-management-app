"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

import {
  renewSubscription,
  type RenewSubscriptionData,
} from "@/app/actions/subscriptions";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReceiptModal } from "@/components/receipt-modal";
import { formatCurrency } from "@/lib/utils";
import type { ActionResult } from "@/lib/action-result";
import type { PackageOption } from "@/components/member-form";

export function RenewDialog({
  memberId,
  packages,
  canRecordPayment,
}: {
  memberId: string;
  packages: PackageOption[];
  canRecordPayment: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [packageId, setPackageId] = React.useState(packages[0]?.id ?? "");
  const [method, setMethod] = React.useState("CASH");
  const [logPayment, setLogPayment] = React.useState(false);
  const [receiptPaymentId, setReceiptPaymentId] = React.useState<string | null>(
    null,
  );
  const router = useRouter();

  const [state, formAction] = useFormState<
    ActionResult<RenewSubscriptionData> | undefined,
    FormData
  >(renewSubscription, undefined);

  React.useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message ?? "Renewed.");
      setOpen(false);
      router.refresh();
      if (state.data?.paymentId) setReceiptPaymentId(state.data.paymentId);
    } else {
      toast.error(state.error);
    }
  }, [state, router]);

  const selected = packages.find((p) => p.id === packageId);

  return (
    <>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-1" disabled={packages.length === 0}>
          <RefreshCw className="h-4 w-4" /> Renew
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Renew subscription</DialogTitle>
            <DialogDescription>
              Starts after the current cycle ends (or today if already expired).
            </DialogDescription>
          </DialogHeader>

          <input type="hidden" name="memberId" value={memberId} />
          <input type="hidden" name="packageId" value={packageId} />
          <input type="hidden" name="method" value={method} />
          <input
            type="hidden"
            name="logPayment"
            value={logPayment ? "1" : "0"}
          />

          <div className="space-y-2">
            <Label>Package</Label>
            <Select value={packageId} onValueChange={setPackageId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a package" />
              </SelectTrigger>
              <SelectContent>
                {packages.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — {formatCurrency(p.price)} / {p.durationLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {canRecordPayment ? (
            <div className="rounded-lg border p-4">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input accent-primary"
                  checked={logPayment}
                  onChange={(e) => setLogPayment(e.target.checked)}
                />
                Record payment now
              </label>
              <p className="mt-1 text-xs text-muted-foreground">
                Partial amounts are allowed — the balance can be paid in
                installments.
              </p>
              {logPayment ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="renew-amount">Amount (INR)</Label>
                    <Input
                      id="renew-amount"
                      name="amount"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={selected?.price}
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
              ) : null}
            </div>
          ) : null}

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
      {pending ? "Renewing..." : "Confirm renewal"}
    </Button>
  );
}
