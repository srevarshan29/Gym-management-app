import { Resend } from "resend";
import { renderToBuffer } from "@react-pdf/renderer";

import { getGymProfile } from "@/lib/gym-profile";
import { getGymNotificationSettings } from "@/lib/notification-settings/get-settings";
import { areAutomaticEmailNotificationsEnabled } from "@/lib/notification-settings/automatic-email";
import { buildPaymentReceiptEmailContent } from "@/lib/notification-settings/payment-receipt-email";
import {
  deliverPaymentReceiptEmails,
  type ReceiptEmailPayload,
} from "@/lib/payment-email-notifications";
import { getOrCreateReceiptByPayment, type ReceiptData } from "@/lib/receipts";
import { formatReceiptNumber } from "@/lib/receipt-display";
import { formatCurrency, formatDate } from "@/lib/utils";
import { schedulePaymentLoggedNotification } from "@/lib/schedule-background-work";
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

async function sendReceiptEmail(payload: ReceiptEmailPayload): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.log(
      `[notifications] Email skipped (no RESEND_API_KEY) -> ${payload.to}: ${payload.subject}`,
    );
    return;
  }

  const from = process.env.RESEND_FROM_EMAIL || "Gym Receipts <onboarding@resend.dev>";
  try {
    const { error } = await resend.emails.send({
      from,
      to: payload.to,
      cc: payload.cc,
      subject: payload.subject,
      html: payload.html,
      attachments: [
        { filename: payload.attachmentFilename, content: payload.attachmentBuffer },
      ],
    });
    if (error) {
      console.error("[notifications] Resend send failed:", {
        to: payload.to,
        cc: payload.cc,
        error,
      });
      throw new Error(error.message ?? "Resend send failed");
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("Resend send failed")) {
      throw err;
    }
    console.error("[notifications] Resend send threw:", {
      to: payload.to,
      cc: payload.cc,
      err,
    });
    throw err;
  }
}

async function renderReceiptPdf(receipt: ReceiptData): Promise<Buffer> {
  return renderToBuffer(<ReceiptDocument receipt={receipt} />);
}

/**
 * Best-effort notifications fired after a payment is logged: SMS to the
 * member + owner, and email (with the PDF receipt attached) to the member
 * (if they have an email on file) and/or the owner. Failures are logged and
 * never affect the payment that was already saved.
 */
export async function notifyPaymentLogged(gymId: string, paymentId: string): Promise<void> {
  try {
    const [receipt, gymProfile, notificationSettings] = await Promise.all([
      getOrCreateReceiptByPayment(gymId, paymentId),
      getGymProfile(gymId),
      getGymNotificationSettings(gymId),
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

    const emailJob =
      areAutomaticEmailNotificationsEnabled(notificationSettings) &&
      notificationSettings.paymentReceiptEmail.enabled
      ? deliverPaymentReceiptEmails({
          receipt,
          ownerNotifyEmail: gymProfile.ownerNotifyEmail,
          sendEmail: sendReceiptEmail,
          renderPdf: renderReceiptPdf,
          emailContent: buildPaymentReceiptEmailContent(
            receipt,
            notificationSettings.paymentReceiptEmail,
          ),
        })
      : Promise.resolve().then(() => {
          console.log(
            areAutomaticEmailNotificationsEnabled(notificationSettings)
              ? "[notifications] Payment receipt email skipped (disabled in gym notification settings)."
              : "[notifications] Payment receipt email skipped (automatic email notifications are off).",
          );
        });

    await Promise.all([...smsJobs, emailJob]);
  } catch (err) {
    console.error("[notifications] notifyPaymentLogged failed:", err);
  }
}

/** Schedule receipt/SMS notifications to complete after the server action responds (Vercel waitUntil). */
export function schedulePaymentLogged(gymId: string, paymentId: string): void {
  schedulePaymentLoggedNotification(gymId, paymentId, notifyPaymentLogged);
}
