import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildReceiptDataUrl,
  buildReceiptPdfUrl,
  fetchReceiptPdfBlob,
  fetchReceiptPreviewData,
  receiptPreviewErrorMessage,
  serializeReceiptPreviewData,
} from "@/lib/receipt-preview";

const { requireGym } = vi.hoisted(() => ({
  requireGym: vi.fn(),
}));

const { getOrCreateReceiptByPayment } = vi.hoisted(() => ({
  getOrCreateReceiptByPayment: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  requireGym,
}));

vi.mock("@/lib/receipts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/receipts")>();
  return {
    ...actual,
    getOrCreateReceiptByPayment,
  };
});

const sampleReceipt = {
  id: "rcpt-1",
  number: 7,
  createdAt: new Date("2026-01-15T10:00:00.000Z"),
  gymName: "Iron Gym",
  gymAddress: "123 Main St",
  gymPhone: "9999999999",
  gymLogoUrl: "https://example.com/logo.png",
  memberId: "84b6562ba87a4df79044567b5",
  memberNumber: 78,
  memberDisplayId: "#0078",
  memberName: "Alex Member",
  memberPhone: "8888888888",
  memberEmail: null,
  packageName: "Gold Plan",
  amount: 1500,
  amountOwed: 3000,
  balanceAfter: 1500,
  method: "UPI",
  paidAt: new Date("2026-01-15T10:00:00.000Z"),
  periodStart: new Date("2026-01-01T00:00:00.000Z"),
  periodEnd: new Date("2026-01-31T00:00:00.000Z"),
};

describe("receipt display formatters", () => {
  it("keeps formatters in client-safe receipt-display module", () => {
    const displaySource = readFileSync(
      resolve("src/lib/receipt-display.ts"),
      "utf8",
    );
    expect(displaySource).toContain("formatReceiptNumber");
    expect(displaySource).toContain("formatMemberNumber");
    expect(displaySource).not.toContain("firestore");
    expect(displaySource).not.toContain("firebase-admin");
  });

  it("formats currency with the rupee symbol", async () => {
    const { formatReceiptDisplayCurrency } = await import("@/lib/receipt-display");
    expect(formatReceiptDisplayCurrency(1000)).toBe("\u20B91,000.00");
  });
});

describe("buildReceiptPdfUrl", () => {
  it("builds inline and download receipt URLs", () => {
    expect(buildReceiptPdfUrl("pay-1")).toBe("/payments/pay-1/receipt");
    expect(buildReceiptPdfUrl("pay-1", { download: true })).toBe(
      "/payments/pay-1/receipt?download=1",
    );
  });
});

describe("buildReceiptDataUrl", () => {
  it("builds the JSON preview endpoint URL", () => {
    expect(buildReceiptDataUrl("pay-1")).toBe("/payments/pay-1/receipt/data");
  });
});

describe("serializeReceiptPreviewData", () => {
  it("serializes receipt dates as ISO strings", () => {
    const payload = serializeReceiptPreviewData(sampleReceipt);
    expect(payload.number).toBe(7);
    expect(payload.memberDisplayId).toBe("#0078");
    expect(payload.paidAt).toBe("2026-01-15T10:00:00.000Z");
    expect(payload.periodStart).toBe("2026-01-01T00:00:00.000Z");
    expect(payload.gymLogoUrl).toBe("https://example.com/logo.png");
  });
});

describe("receiptPreviewErrorMessage", () => {
  it("maps auth and missing receipt statuses", () => {
    expect(receiptPreviewErrorMessage(403)).toContain("permission");
    expect(receiptPreviewErrorMessage(404)).toContain("not found");
    expect(receiptPreviewErrorMessage(500, "Server exploded")).toBe(
      "Server exploded",
    );
  });
});

describe("fetchReceiptPreviewData", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns receipt JSON for successful responses", async () => {
    const payload = serializeReceiptPreviewData(sampleReceipt);
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ receipt: payload }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await fetchReceiptPreviewData("pay-1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.receipt.memberName).toBe("Alex Member");
    }
    expect(fetch).toHaveBeenCalledWith(
      "/payments/pay-1/receipt/data",
      expect.objectContaining({ credentials: "same-origin", cache: "no-store" }),
    );
  });

  it("surfaces JSON error payloads from failed receipt loads", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: "Receipt not found." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await fetchReceiptPreviewData("missing");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe("Receipt not found.");
      expect(result.status).toBe(404);
    }
  });
});

describe("fetchReceiptPdfBlob", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns a blob for valid PDF responses", async () => {
    const blob = new Blob(["%PDF-1.4"], { type: "application/pdf" });
    vi.mocked(fetch).mockResolvedValue(
      new Response(blob, {
        status: 200,
        headers: { "Content-Type": "application/pdf" },
      }),
    );

    const result = await fetchReceiptPdfBlob("pay-1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.blob.type).toContain("pdf");
    }
    expect(fetch).toHaveBeenCalledWith(
      "/payments/pay-1/receipt",
      expect.objectContaining({ credentials: "same-origin", cache: "no-store" }),
    );
  });

  it("surfaces JSON error payloads from failed receipt loads", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: "Receipt not found." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await fetchReceiptPdfBlob("missing");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe("Receipt not found.");
      expect(result.status).toBe(404);
    }
  });

  it("rejects non-PDF success responses", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response("<html></html>", {
        status: 200,
        headers: { "Content-Type": "text/html" },
      }),
    );

    const result = await fetchReceiptPdfBlob("pay-1");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("unexpected format");
    }
  });
});

describe("receipt data route", () => {
  beforeEach(() => {
    requireGym.mockReset();
    getOrCreateReceiptByPayment.mockReset();
  });

  it("returns 403 when the user cannot log payments", async () => {
    requireGym.mockResolvedValue({ gymId: "gym-1", role: "MEMBER" });
    const { GET } = await import(
      "@/app/(app)/payments/[paymentId]/receipt/data/route"
    );
    const response = await GET(new Request("http://localhost/test"), {
      params: { paymentId: "pay-1" },
    });
    expect(response.status).toBe(403);
  });

  it("returns receipt JSON for authorized users", async () => {
    requireGym.mockResolvedValue({ gymId: "gym-1", role: "STAFF" });
    getOrCreateReceiptByPayment.mockResolvedValue(sampleReceipt);
    const { GET } = await import(
      "@/app/(app)/payments/[paymentId]/receipt/data/route"
    );
    const response = await GET(new Request("http://localhost/test"), {
      params: { paymentId: "pay-1" },
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { receipt: { memberName: string } };
    expect(body.receipt.memberName).toBe("Alex Member");
    expect(getOrCreateReceiptByPayment).toHaveBeenCalledWith("gym-1", "pay-1");
  });

  it("returns 404 when receipt lookup fails", async () => {
    requireGym.mockResolvedValue({ gymId: "gym-1", role: "ADMIN" });
    getOrCreateReceiptByPayment.mockRejectedValue(new Error("missing"));
    const { GET } = await import(
      "@/app/(app)/payments/[paymentId]/receipt/data/route"
    );
    const response = await GET(new Request("http://localhost/test"), {
      params: { paymentId: "missing" },
    });
    expect(response.status).toBe(404);
  });
});

describe("receipt HTML preview UI", () => {
  it("uses JSON preview fetch instead of PDF blob preview in the modal", () => {
    const modalSource = readFileSync(
      resolve("src/components/receipt-modal.tsx"),
      "utf8",
    );
    expect(modalSource).toContain("ReceiptHtmlPreview");
    expect(modalSource).not.toContain("ReceiptPdfPreview");
    expect(modalSource).toContain('buildReceiptPdfUrl(paymentId, { download: true })');
    expect(modalSource).not.toContain("<iframe");
  });

  it("renders unified receipt sections in the HTML preview view", () => {
    const viewSource = readFileSync(
      resolve("src/components/receipt-html-view.tsx"),
      "utf8",
    );
    expect(viewSource).toContain("RECEIPT_COPY.documentTitle");
    expect(viewSource).toContain("RECEIPT_COPY.billedTo");
    expect(viewSource).toContain("RECEIPT_COPY.paymentDetails");
    expect(viewSource).toContain("RECEIPT_COPY.amountPaid");
    expect(viewSource).toContain("RECEIPT_COPY.installmentSummary");
    expect(viewSource).toContain("RECEIPT_COPY.footerThanks");
    expect(viewSource).toContain("RECEIPT_COPY.footerLegal");
    expect(viewSource).toContain('loading="lazy"');
    expect(viewSource).toContain("min-w-0");
    expect(viewSource).toContain("overflow-x-hidden");
    expect(viewSource).toContain("break-words");
    expect(viewSource).toContain("receipt.memberDisplayId");
    expect(viewSource).not.toContain("receipt.memberId");
  });

  it("uses shared receipt design tokens in the PDF document", () => {
    const pdfSource = readFileSync(
      resolve("src/components/receipt-document.tsx"),
      "utf8",
    );
    expect(pdfSource).toContain("RECEIPT_DESIGN");
    expect(pdfSource).toContain("RECEIPT_COPY");
    expect(pdfSource).toContain("RECEIPT_FIELD_LABELS");
    expect(pdfSource).toContain("formatReceiptDisplayCurrency");
    expect(pdfSource).toContain("formatReceiptDisplayDate");
    expect(pdfSource).toContain("receipt.memberDisplayId");
    expect(pdfSource).not.toMatch(/receipt\.memberId/);
    expect(pdfSource).not.toContain("#2563eb");
  });

  it("loads preview data from the receipt data endpoint", () => {
    const previewSource = readFileSync(
      resolve("src/components/receipt-html-preview.tsx"),
      "utf8",
    );
    expect(previewSource).toContain("fetchReceiptPreviewData");
    expect(previewSource).not.toContain("fetchReceiptPdfBlob");
    expect(previewSource).toContain("overflow-x-hidden");
  });
});
