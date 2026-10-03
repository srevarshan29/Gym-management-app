"use client";

import * as React from "react";

import { ReceiptHtmlView } from "@/components/receipt-html-view";
import type { ReceiptPreviewData } from "@/lib/receipt-preview";
import { fetchReceiptPreviewData } from "@/lib/receipt-preview";
import { cn } from "@/lib/utils";

type ReceiptHtmlPreviewProps = {
  paymentId: string;
  className?: string;
};

export function ReceiptHtmlPreview({ paymentId, className }: ReceiptHtmlPreviewProps) {
  const [receipt, setReceipt] = React.useState<ReceiptPreviewData | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setReceipt(null);

      const result = await fetchReceiptPreviewData(paymentId);
      if (cancelled) return;

      if (!result.ok) {
        setError(result.message);
        setLoading(false);
        return;
      }

      setReceipt(result.receipt);
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [paymentId]);

  if (loading) {
    return (
      <div
        className={cn(
          "flex min-h-[12rem] items-center justify-center rounded-lg border bg-muted/30 text-sm text-muted-foreground",
          className,
        )}
      >
        Loading receipt…
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div
        className={cn(
          "flex min-h-[12rem] items-center justify-center rounded-lg border border-dashed bg-muted/20 px-4 text-center text-sm text-muted-foreground",
          className,
        )}
      >
        {error ?? "Could not load receipt preview."}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "min-w-0 max-w-full overflow-x-hidden overflow-y-auto max-h-[min(60vh,28rem)]",
        className,
      )}
    >
      <ReceiptHtmlView receipt={receipt} />
    </div>
  );
}
