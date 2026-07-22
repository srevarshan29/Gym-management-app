"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { ReceiptModal } from "@/components/receipt-modal";

/**
 * Watches for a `?receipt=<paymentId>` query param (set when a new member is
 * created with an initial payment) and auto-opens the receipt modal for it.
 * Clears the query param once the modal is dismissed.
 */
export function AutoOpenReceipt() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const receiptParam = searchParams.get("receipt");
  const [paymentId, setPaymentId] = React.useState<string | null>(receiptParam);

  React.useEffect(() => {
    setPaymentId(receiptParam);
  }, [receiptParam]);

  function handleOpenChange(open: boolean) {
    if (!open) {
      setPaymentId(null);
      router.replace(pathname);
    }
  }

  return <ReceiptModal paymentId={paymentId} onOpenChange={handleOpenChange} />;
}
