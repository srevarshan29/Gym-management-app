import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { deliverPaymentReceiptEmails } from "@/lib/payment-email-notifications";
import type { ReceiptData } from "@/lib/receipts";

const baseReceipt: ReceiptData = {
  id: "rcpt-1",
  number: 73,
  createdAt: new Date("2026-10-03T10:00:00.000Z"),
  gymName: "Iron Gym",
  gymAddress: "123 Main St",
  gymPhone: "9999999999",
  gymLogoUrl: null,
  memberId: "member-abc-long-id-should-wrap",
  memberNumber: 49,
  memberDisplayId: "#0049",
  memberName: "Priya",
  memberPhone: "7777777777",
  memberEmail: "priya@example.com",
  packageName: "Annual",
  amount: 1000,
  amountOwed: null,
  balanceAfter: null,
  method: "CASH",
  paidAt: new Date("2026-10-03T10:00:00.000Z"),
  periodStart: new Date("2026-10-03T00:00:00.000Z"),
  periodEnd: new Date("2027-10-03T00:00:00.000Z"),
};

describe("deliverPaymentReceiptEmails", () => {
  const sendEmail = vi.fn<Parameters<typeof deliverPaymentReceiptEmails>[0]["sendEmail"]>();
  const renderPdf = vi.fn(async () => Buffer.from("%PDF-test"));

  beforeEach(() => {
    sendEmail.mockReset();
    renderPdf.mockClear();
    sendEmail.mockResolvedValue(undefined);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends to member only when owner email is not configured", async () => {
    await deliverPaymentReceiptEmails({
      receipt: baseReceipt,
      ownerNotifyEmail: null,
      sendEmail,
      renderPdf,
    });

    expect(renderPdf).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail.mock.calls[0]?.[0].to).toBe("priya@example.com");
    expect(sendEmail.mock.calls[0]?.[0].cc).toBeUndefined();
  });

  it("sends to owner only when member has no email", async () => {
    await deliverPaymentReceiptEmails({
      receipt: { ...baseReceipt, memberEmail: null },
      ownerNotifyEmail: "owner@gym.com",
      sendEmail,
      renderPdf,
    });

    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail.mock.calls[0]?.[0].to).toBe("owner@gym.com");
    expect(sendEmail.mock.calls[0]?.[0].subject).toContain("member has no email");
  });

  it("sends to member with owner CC when both emails exist", async () => {
    await deliverPaymentReceiptEmails({
      receipt: baseReceipt,
      ownerNotifyEmail: "owner@gym.com",
      sendEmail,
      renderPdf,
    });

    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail.mock.calls[0]?.[0].to).toBe("priya@example.com");
    expect(sendEmail.mock.calls[0]?.[0].cc).toEqual(["owner@gym.com"]);
  });

  it("logs and skips email when no addresses are configured", async () => {
    await deliverPaymentReceiptEmails({
      receipt: { ...baseReceipt, memberEmail: null },
      ownerNotifyEmail: null,
      sendEmail,
      renderPdf,
    });

    expect(renderPdf).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("Email skipped"),
    );
  });

  it("logs PDF failures and does not send email", async () => {
    renderPdf.mockRejectedValueOnce(new Error("pdf boom"));

    await deliverPaymentReceiptEmails({
      receipt: baseReceipt,
      ownerNotifyEmail: "owner@gym.com",
      sendEmail,
      renderPdf,
    });

    expect(sendEmail).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("PDF generation failed"),
      expect.any(Error),
    );
  });

  it("still notifies owner when member Resend send fails", async () => {
    sendEmail
      .mockRejectedValueOnce(new Error("member resend failed"))
      .mockResolvedValueOnce(undefined);

    await deliverPaymentReceiptEmails({
      receipt: baseReceipt,
      ownerNotifyEmail: "owner@gym.com",
      sendEmail,
      renderPdf,
    });

    expect(sendEmail).toHaveBeenCalledTimes(2);
    expect(sendEmail.mock.calls[1]?.[0].to).toBe("owner@gym.com");
    expect(sendEmail.mock.calls[1]?.[0].subject).toContain("member delivery failed");
    expect(console.error).toHaveBeenCalledWith(
      "[notifications] Member receipt email failed:",
      expect.objectContaining({ to: "priya@example.com" }),
    );
  });

  it("logs owner Resend failure without throwing", async () => {
    sendEmail.mockRejectedValueOnce(new Error("owner resend failed"));

    await expect(
      deliverPaymentReceiptEmails({
        receipt: { ...baseReceipt, memberEmail: null },
        ownerNotifyEmail: "owner@gym.com",
        sendEmail,
        renderPdf,
      }),
    ).resolves.toBeUndefined();

    expect(console.error).toHaveBeenCalledWith(
      "[notifications] Owner receipt email failed:",
      expect.objectContaining({ to: "owner@gym.com" }),
    );
  });

  it("logs member-only Resend failure without throwing", async () => {
    sendEmail.mockRejectedValueOnce(new Error("resend down"));

    await expect(
      deliverPaymentReceiptEmails({
        receipt: baseReceipt,
        ownerNotifyEmail: null,
        sendEmail,
        renderPdf,
      }),
    ).resolves.toBeUndefined();

    expect(console.error).toHaveBeenCalledWith(
      "[notifications] Member receipt email failed:",
      expect.objectContaining({ to: "priya@example.com" }),
    );
  });
});
