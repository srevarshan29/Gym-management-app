"use client";

import { Download } from "lucide-react";

import { ReceiptPdfPreview } from "@/components/receipt-pdf-preview";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { buildReceiptPdfUrl } from "@/lib/receipt-preview";

export function ReceiptModal({
  paymentId,
  onOpenChange,
}: {
  paymentId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={paymentId !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(42rem,calc(100vw-2rem))]">
        <DialogHeader>
          <DialogTitle>Payment receipt</DialogTitle>
          <DialogDescription>
            Payment recorded successfully. You can download it now, or come
            back to it later from the member&apos;s payment history.
          </DialogDescription>
        </DialogHeader>

        {paymentId ? (
          <>
            <ReceiptPdfPreview paymentId={paymentId} />

            <DialogFooter>
              <Button asChild>
                <a href={buildReceiptPdfUrl(paymentId, { download: true })} download>
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
