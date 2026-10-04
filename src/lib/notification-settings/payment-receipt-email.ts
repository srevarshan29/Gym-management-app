import { formatReceiptNumber } from "@/lib/receipt-display";
import {
  plainTextToHtml,
  substituteNotificationTemplate,
} from "@/lib/notification-settings/template-variables";
import type { NotificationChannelSettings } from "@/lib/notification-settings/types";
import {
  buildReceiptEmailHtml,
} from "@/lib/payment-email-notifications";
import type { ReceiptData } from "@/lib/receipts";
import { formatCurrency, formatDate } from "@/lib/utils";

export function buildPaymentReceiptEmailContent(
  receipt: ReceiptData,
  template: NotificationChannelSettings,
): { subject: string; html: string } {
  const receiptNumber = formatReceiptNumber(receipt.number);
  const subject = substituteNotificationTemplate(template.subject, {
    receipt_number: receiptNumber,
    gym_name: receipt.gymName,
    member_name: receipt.memberName,
  });

  if (!template.body.trim()) {
    return {
      subject,
      html: buildReceiptEmailHtml(receipt, receiptNumber),
    };
  }

  const validity =
    receipt.periodStart && receipt.periodEnd
      ? `${formatDate(receipt.periodStart)} to ${formatDate(receipt.periodEnd)}`
      : "";

  const bodyText = substituteNotificationTemplate(template.body, {
    receipt_number: receiptNumber,
    gym_name: receipt.gymName,
    member_name: receipt.memberName,
    payment_amount: formatCurrency(receipt.amount),
    paid_at: formatDate(receipt.paidAt),
    validity_period: validity,
  });

  const html = `
  <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; color: #111827;">
    ${plainTextToHtml(bodyText)}
    <p style="margin:0;font-size:14px;color:#334155;">Your receipt (${receiptNumber}) is attached as a PDF.</p>
  </div>`;

  return { subject, html };
}
