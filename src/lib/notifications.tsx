import { Resend } from "resend";
import { renderToBuffer } from "@react-pdf/renderer";

import { getGymProfile } from "@/lib/gym-profile";
import {
  formatReceiptNumber,
  getOrCreateReceiptByPayment,
  type ReceiptData,
} from "@/lib/receipts";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ReceiptDocument } from "@/components/receipt-document";

const FAST2SMS_ENDPOINT = "https://www.fast2sms.com/dev/bulkV2";

/**
 * Sends an SMS via Fast2SMS. No-ops (with a log line) when FAST2SMS_API_KEY
 * is not configured, so the app works fully without an SMS provider set up.
 *
 * Note: Fast2SMS/Indian carriers require a DLT-registered template + sender
 * ID for custom transactional SMS content in production. This uses the
 * "quick SMS" route, which is fine for testing but may need to switch to
 * `dlt_manual` with an approved template ID once DLT registration is done.
 */
async function sendSms(to: string, message: string): Promise<void> {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey) {
    console.log(`[notifications] SMS skipped (no FAST2SMS_API_KEY) -> ${to}: ${message}`);
    return;
  }

  const digits = to.replace(/\D/g, "").slice(-10);
  if (digits.length !== 10) {
    console.warn(`[notifications] SMS skipped: "${to}" is not a valid 10-digit number.`);
    return;
  }

  try {
    const res = await fetch(FAST2SMS_ENDPOINT, {
      method: "POST",
      headers: {
        authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        route: "q",
        message,
        language: "english",
        flash: 0,
        numbers: digits,
      }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || body?.return === false) {
      console.error("[notifications] Fast2SMS request failed:", body ?? res.statusText);
    }
  } catch (err) {
    console.error("[notifications] Fast2SMS request threw:", err);
  }
}

let cachedResend: Resend | null | undefined;

function getResend(): Resend | null {
  if (cachedResend !== undefined) return cachedResend;
  const key = process.env.RESEND_API_KEY;
  cachedResend = key ? new Resend(key) : null;
  return cachedResend;
}

async function sendReceiptEmail({
  to,
  cc,
  subject,
  html,
  attachmentBuffer,
  attachmentFilename,
}: {
  to: string;
  cc?: string[];
  subject: string;
  html: string;
  attachmentBuffer: Buffer;
  attachmentFilename: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.log(`[notifications] Email skipped (no RESEND_API_KEY) -> ${to}: ${subject}`);
    return;
  }

  const from = process.env.RESEND_FROM_EMAIL || "Gym Receipts <onboarding@resend.dev>";
  try {
    const { error } = await resend.emails.send({
      from,
      to,
      cc,
      subject,
      html,
      attachments: [{ filename: attachmentFilename, content: attachmentBuffer }],
    });
    if (error) console.error("[notifications] Resend send failed:", error);
  } catch (err) {
    console.error("[notifications] Resend send threw:", err);
  }
}

function buildReceiptEmailHtml(receipt: ReceiptData, receiptNumber: string): string {
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
 * Best-effort notifications fired after a payment is logged: SMS to the
 * member + owner, and email (with the PDF receipt attached) to the member
 * (if they have an email on file) and/or the owner. Every provider call is
 * caught internally so a notification failure never affects the payment
 * that was already saved.
 */
export async function notifyPaymentLogged(gymId: string, paymentId: string): Promise<void> {
  try {
    const [receipt, gymProfile] = await Promise.all([
      getOrCreateReceiptByPayment(gymId, paymentId),
      getGymProfile(gymId),
    ]);

    const receiptNumber = formatReceiptNumber(receipt.number);
    const amountLabel = formatCurrency(receipt.amount);
    const validityLabel = receipt.periodEnd ? formatDate(receipt.periodEnd) : null;

    const smsJobs: Promise<void>[] = [];

    if (receipt.memberPhone) {
      const memberMsg = validityLabel
        ? `Payment of ${amountLabel} received at ${receipt.gymName}. Your subscription is valid until ${validityLabel}. Receipt ${receiptNumber}.`
        : `Payment of ${amountLabel} received at ${receipt.gymName}. Receipt ${receiptNumber}. Thank you!`;
      smsJobs.push(sendSms(receipt.memberPhone, memberMsg));
    }

    if (gymProfile.ownerNotifyPhone) {
      const ownerMsg = `${receipt.memberName} paid ${amountLabel} on ${formatDate(receipt.paidAt)}. Receipt ${receiptNumber}.`;
      smsJobs.push(sendSms(gymProfile.ownerNotifyPhone, ownerMsg));
    }

    const emailJobs: Promise<void>[] = [];

    if (receipt.memberEmail || gymProfile.ownerNotifyEmail) {
      const pdfBuffer = await renderToBuffer(<ReceiptDocument receipt={receipt} />);
      const filename = `${receiptNumber}.pdf`;
      const subject = `Payment receipt ${receiptNumber} - ${receipt.gymName}`;
      const html = buildReceiptEmailHtml(receipt, receiptNumber);

      if (receipt.memberEmail) {
        emailJobs.push(
          sendReceiptEmail({
            to: receipt.memberEmail,
            cc: gymProfile.ownerNotifyEmail ? [gymProfile.ownerNotifyEmail] : undefined,
            subject,
            html,
            attachmentBuffer: pdfBuffer,
            attachmentFilename: filename,
          }),
        );
      } else if (gymProfile.ownerNotifyEmail) {
        emailJobs.push(
          sendReceiptEmail({
            to: gymProfile.ownerNotifyEmail,
            subject: `${subject} (member has no email on file)`,
            html,
            attachmentBuffer: pdfBuffer,
            attachmentFilename: filename,
          }),
        );
      }
    }

    await Promise.all([...smsJobs, ...emailJobs]);
  } catch (err) {
    console.error("[notifications] notifyPaymentLogged failed:", err);
  }
}
