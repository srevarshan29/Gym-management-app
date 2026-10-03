import type { ReceiptData } from "@/lib/receipts";

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

export function buildReceiptDataUrl(paymentId: string): string {
  return `/payments/${paymentId}/receipt/data`;
}

/** JSON-safe receipt fields for the HTML preview (no PDF generation). */
export type ReceiptPreviewData = {
  number: number;
  gymName: string;
  gymAddress: string | null;
  gymPhone: string | null;
  gymLogoUrl: string | null;
  memberId: string;
  memberName: string;
  memberPhone: string;
  packageName: string | null;
  amount: number;
  amountOwed: number | null;
  balanceAfter: number | null;
  method: string;
  paidAt: string;
  periodStart: string | null;
  periodEnd: string | null;
};

export function serializeReceiptPreviewData(receipt: ReceiptData): ReceiptPreviewData {
  return {
    number: receipt.number,
    gymName: receipt.gymName,
    gymAddress: receipt.gymAddress,
    gymPhone: receipt.gymPhone,
    gymLogoUrl: receipt.gymLogoUrl,
    memberId: receipt.memberId,
    memberName: receipt.memberName,
    memberPhone: receipt.memberPhone,
    packageName: receipt.packageName,
    amount: receipt.amount,
    amountOwed: receipt.amountOwed,
    balanceAfter: receipt.balanceAfter,
    method: receipt.method,
    paidAt: receipt.paidAt.toISOString(),
    periodStart: receipt.periodStart?.toISOString() ?? null,
    periodEnd: receipt.periodEnd?.toISOString() ?? null,
  };
}

export type ReceiptPreviewFetchResult =
  | { ok: true; receipt: ReceiptPreviewData }
  | { ok: false; status: number; message: string };

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

export async function fetchReceiptPreviewData(
  paymentId: string,
  init?: RequestInit,
): Promise<ReceiptPreviewFetchResult> {
  const response = await fetch(buildReceiptDataUrl(paymentId), {
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

  try {
    const data = (await response.json()) as { receipt?: ReceiptPreviewData };
    if (!data.receipt) {
      return {
        ok: false,
        status: response.status,
        message: "Receipt preview returned an unexpected format.",
      };
    }
    return { ok: true, receipt: data.receipt };
  } catch {
    return {
      ok: false,
      status: response.status,
      message: "Could not load receipt preview.",
    };
  }
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
