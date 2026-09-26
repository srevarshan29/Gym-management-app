export function buildReceiptPdfUrl(
  paymentId: string,
  options?: { download?: boolean },
): string {
  const base = `/payments/${paymentId}/receipt`;
  if (options?.download) {
    return `${base}?download=1`;
  }
  return base;
}

export type ReceiptPdfFetchResult =
  | { ok: true; blob: Blob }
  | { ok: false; status: number; message: string };

export function receiptPreviewErrorMessage(
  status: number,
  payloadError?: string,
): string {
  if (payloadError?.trim()) {
    return payloadError.trim();
  }
  if (status === 403) {
    return "You do not have permission to view this receipt.";
  }
  if (status === 404) {
    return "Receipt not found.";
  }
  return "Could not load receipt preview.";
}

export async function fetchReceiptPdfBlob(
  paymentId: string,
  init?: RequestInit,
): Promise<ReceiptPdfFetchResult> {
  const response = await fetch(buildReceiptPdfUrl(paymentId), {
    credentials: "same-origin",
    cache: "no-store",
    ...init,
  });

  if (!response.ok) {
    let payloadError: string | undefined;
    try {
      const data = (await response.json()) as { error?: string };
      payloadError = data.error;
    } catch {
      payloadError = undefined;
    }
    return {
      ok: false,
      status: response.status,
      message: receiptPreviewErrorMessage(response.status, payloadError),
    };
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/pdf")) {
    return {
      ok: false,
      status: response.status,
      message: "Receipt preview returned an unexpected format.",
    };
  }

  const blob = await response.blob();
  if (blob.size === 0) {
    return {
      ok: false,
      status: response.status,
      message: "Receipt PDF is empty.",
    };
  }

  return { ok: true, blob };
}
