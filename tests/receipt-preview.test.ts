import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildReceiptPdfUrl,
  fetchReceiptPdfBlob,
  receiptPreviewErrorMessage,
} from "@/lib/receipt-preview";

describe("buildReceiptPdfUrl", () => {
  it("builds inline and download receipt URLs", () => {
    expect(buildReceiptPdfUrl("pay-1")).toBe("/payments/pay-1/receipt");
    expect(buildReceiptPdfUrl("pay-1", { download: true })).toBe(
      "/payments/pay-1/receipt?download=1",
    );
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
