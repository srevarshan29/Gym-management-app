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
import { formatCurrency, formatDate } from "@/lib/utils";
import { membershipNeedsRenewalConfirmation } from "@/lib/subscription-renewal";
import type { SubscriptionStatus } from "@/lib/subscription";
import { useGuardedFormAction } from "@/hooks/use-guarded-form-action";
import type { ActionResult } from "@/lib/action-result";
import type { PackageOption } from "@/components/member-form";

export function RenewDialog({
  memberId,
  packages,
  canRecordPayment,
  membershipStatus,
  currentMembershipEndDate,
}: {
  memberId: string;
  packages: PackageOption[];
  canRecordPayment: boolean;
  membershipStatus: SubscriptionStatus;
  currentMembershipEndDate: Date | null;
}) {
  const [open, setOpen] = React.useState(false);
  const [packageId, setPackageId] = React.useState(packages[0]?.id ?? "");
  const [method, setMethod] = React.useState("CASH");
  const [logPayment, setLogPayment] = React.useState(false);
  const [activeConfirmed, setActiveConfirmed] = React.useState(false);
  const [receiptPaymentId, setReceiptPaymentId] = React.useState<string | null>(
    null,
  );
  const router = useRouter();

  const guardedAction = useGuardedFormAction(renewSubscription);
  const [state, formAction] = useFormState<
    ActionResult<RenewSubscriptionData> | undefined,
    FormData
  >(guardedAction, undefined);

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
  const needsActiveConfirm = membershipNeedsRenewalConfirmation(membershipStatus);

  React.useEffect(() => {
    if (!open) setActiveConfirmed(false);
  }, [open]);

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
          <input
            type="hidden"
            name="activeMembershipConfirmed"
            value={needsActiveConfirm && activeConfirmed ? "1" : "0"}
          />

          {needsActiveConfirm && currentMembershipEndDate ? (
            <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/80 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/30">
              <p>
                Current membership ends on{" "}
                <strong>{formatDate(currentMembershipEndDate)}</strong>.
              </p>
              <p className="text-muted-foreground">
                New membership will start after the current membership period.
              </p>
              <label className="flex cursor-pointer items-start gap-2 font-medium">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
                  checked={activeConfirmed}
                  onChange={(e) => setActiveConfirmed(e.target.checked)}
                />
                I confirm the next membership should begin after the current
                period ends.
              </label>
            </div>
          ) : null}

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
            <SubmitButton
              disabled={needsActiveConfirm && !activeConfirmed}
            />
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

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled}>
      {pending ? "Renewing..." : "Confirm renewal"}
    </Button>
  );
}
