import type { ReceiptData } from "@/lib/receipts";
import { formatReceiptNumber } from "@/lib/receipt-display";
import { formatCurrency, formatDate } from "@/lib/utils";

export type ReceiptEmailPayload = {
  to: string;
  cc?: string[];
  subject: string;
  html: string;
  attachmentBuffer: Buffer;
  attachmentFilename: string;
};

export type ReceiptEmailSender = (payload: ReceiptEmailPayload) => Promise<void>;

export type ReceiptPdfRenderer = (receipt: ReceiptData) => Promise<Buffer>;

function normalizeEmail(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function buildReceiptEmailHtml(
  receipt: ReceiptData,
  receiptNumber: string,
): string {
  const amountLabel = formatCurrency(receipt.amount);
  const validity =
    receipt.periodStart && receipt.periodEnd
      ? `${formatDate(receipt.periodStart)} to ${formatDate(receipt.periodEnd)}`
      : null;

  return `
  <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto;">
    <div style="background:#2563eb; color:#ffffff; padding:20px 24px; border-radius:12px 12px 0 0;">
      <p style="margin:0; font-size:18px; font-weight:700;">${receipt.gymName}</p>
      <p style="margin:4px 0 0; font-size:13px; opacity:0.9;">Payment receipt ${receiptNumber}</p>
    </div>
    <div style="border:1px solid #e2e8f0; border-top:none; border-radius:0 0 12px 12px; padding:24px;">
      <p style="margin:0 0 12px; font-size:14px; color:#0f172a;">Hi ${receipt.memberName},</p>
      <p style="margin:0 0 16px; font-size:14px; color:#334155; line-height:1.5;">
        We've received your payment of <strong>${amountLabel}</strong> on ${formatDate(receipt.paidAt)}.
        ${validity ? `Your subscription is valid from <strong>${validity}</strong>.` : ""}
      </p>
      <p style="margin:0 0 16px; font-size:14px; color:#334155;">
        Your receipt (${receiptNumber}) is attached as a PDF.
      </p>
      <p style="margin:0; font-size:12px; color:#94a3b8;">Thank you for choosing ${receipt.gymName}.</p>
    </div>
  </div>`;
}

/**
 * Sends payment receipt emails to member and/or owner.
 * Member and owner deliveries are independent; PDF is rendered once when any recipient exists.
 */
export async function deliverPaymentReceiptEmails(params: {
  receipt: ReceiptData;
  ownerNotifyEmail: string | null;
  sendEmail: ReceiptEmailSender;
  renderPdf: ReceiptPdfRenderer;
  emailContent?: { subject: string; html: string };
}): Promise<void> {
  const memberEmail = normalizeEmail(params.receipt.memberEmail);
  const ownerEmail = normalizeEmail(params.ownerNotifyEmail);

  if (!memberEmail && !ownerEmail) {
    console.log(
      "[notifications] Email skipped: no member email and no owner notification email configured.",
    );
    return;
  }

  let attachmentBuffer: Buffer;
  try {
    attachmentBuffer = await params.renderPdf(params.receipt);
  } catch (err) {
    console.error(
      "[notifications] PDF generation failed for payment receipt email:",
      err,
    );
    return;
  }

  const receiptNumber = formatReceiptNumber(params.receipt.number);
  const attachmentFilename = `${receiptNumber}.pdf`;
  const baseSubject =
    params.emailContent?.subject ??
    `Payment receipt ${receiptNumber} - ${params.receipt.gymName}`;
  const html =
    params.emailContent?.html ??
    buildReceiptEmailHtml(params.receipt, receiptNumber);

  const basePayload = {
    html,
    attachmentBuffer,
    attachmentFilename,
  };

  let ownerNotified = false;

  if (memberEmail) {
    try {
      await params.sendEmail({
        ...basePayload,
        to: memberEmail,
        cc: ownerEmail ? [ownerEmail] : undefined,
        subject: baseSubject,
      });
      ownerNotified = Boolean(ownerEmail);
    } catch (err) {
      console.error("[notifications] Member receipt email failed:", {
        to: memberEmail,
        err,
      });
    }
  }

  if (ownerEmail && !ownerNotified) {
    try {
      await params.sendEmail({
        ...basePayload,
        to: ownerEmail,
        subject: memberEmail
          ? `${baseSubject} (copy — member delivery failed)`
          : `${baseSubject} (member has no email on file)`,
      });
    } catch (err) {
      console.error("[notifications] Owner receipt email failed:", {
        to: ownerEmail,
        err,
      });
    }
  }
}
