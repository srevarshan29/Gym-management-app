"use client";

import * as React from "react";

import { fetchReceiptPdfBlob } from "@/lib/receipt-preview";
import { cn } from "@/lib/utils";

type ReceiptPdfPreviewProps = {
  paymentId: string;
  className?: string;
};

export function ReceiptPdfPreview({ paymentId, className }: ReceiptPdfPreviewProps) {
  const [objectUrl, setObjectUrl] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    let blobUrl: string | null = null;

    async function load() {
      setLoading(true);
      setError(null);
      setObjectUrl(null);

      const result = await fetchReceiptPdfBlob(paymentId);
      if (cancelled) return;

      if (!result.ok) {
        setError(result.message);
        setLoading(false);
        return;
      }

      blobUrl = URL.createObjectURL(result.blob);
      setObjectUrl(blobUrl);
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [paymentId]);

  if (loading) {
    return (
      <div
        className={cn(
          "flex h-[min(60vh,28rem)] items-center justify-center rounded-lg border bg-muted/30 text-sm text-muted-foreground",
          className,
        )}
      >
        Loading receipt…
      </div>
    );
  }

  if (error || !objectUrl) {
    return (
      <div
        className={cn(
          "flex h-[min(60vh,28rem)] items-center justify-center rounded-lg border border-dashed bg-muted/20 px-4 text-center text-sm text-muted-foreground",
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
        "h-[min(60vh,28rem)] overflow-hidden rounded-lg border bg-background",
        className,
      )}
    >
      <object
        data={objectUrl}
        type="application/pdf"
        aria-label="Payment receipt PDF preview"
        className="h-full w-full bg-background"
      >
        <p className="p-4 text-sm text-muted-foreground">
          PDF preview is not supported in this browser. Use Download PDF below.
        </p>
      </object>
    </div>
  );
}
