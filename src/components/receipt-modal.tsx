"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ReceiptModal({
  paymentId,
  onOpenChange,
}: {
  paymentId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={paymentId !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Payment receipt</DialogTitle>
          <DialogDescription>
            Payment recorded successfully. You can download it now, or come
            back to it later from the member&apos;s payment history.
          </DialogDescription>
        </DialogHeader>

        {paymentId ? (
          <>
            <div className="h-[60vh] overflow-hidden rounded-lg border bg-muted">
              <iframe
                src={`/payments/${paymentId}/receipt`}
                title="Payment receipt preview"
                className="h-full w-full"
              />
            </div>

            <DialogFooter>
              <Button asChild>
                <a href={`/payments/${paymentId}/receipt?download=1`} download>
                  <Download className="h-4 w-4" /> Download PDF
                </a>
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
