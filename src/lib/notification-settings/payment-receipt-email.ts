import { formatReceiptNumber } from "@/lib/receipt-display";
import {
  buildCoreNotificationTemplateVariables,
  computeCalendarDaysRemaining,
  plainTextToHtml,
  substituteNotificationTemplate,
  PAYMENT_RECEIPT_EXTRA_TEMPLATE_VARIABLES,
} from "@/lib/notification-settings/template-variables";
import type { NotificationChannelSettings } from "@/lib/notification-settings/types";
import { buildReceiptEmailHtml } from "@/lib/payment-email-notifications";
import type { ReceiptData } from "@/lib/receipts";

function paymentReceiptTemplateVariables(receipt: ReceiptData) {
  const daysRemaining = receipt.periodEnd
    ? computeCalendarDaysRemaining(receipt.periodEnd, receipt.paidAt)
    : null;

  return {
    ...buildCoreNotificationTemplateVariables({
      memberName: receipt.memberName,
      gymName: receipt.gymName,
      expiryDate: receipt.periodEnd,
      daysRemaining,
    }),
    receipt_number: formatReceiptNumber(receipt.number),
  };
}

export function buildPaymentReceiptEmailContent(
  receipt: ReceiptData,
  template: NotificationChannelSettings,
): { subject: string; html: string } {
  const vars = paymentReceiptTemplateVariables(receipt);
  const substituteOptions = {
    extraAllowedVariables: PAYMENT_RECEIPT_EXTRA_TEMPLATE_VARIABLES,
  };

  const subject = substituteNotificationTemplate(
    template.subject,
    vars,
    substituteOptions,
  );

  if (!template.body.trim()) {
    return {
      subject,
      html: buildReceiptEmailHtml(receipt, vars.receipt_number),
    };
  }

  const bodyText = substituteNotificationTemplate(
    template.body,
    vars,
    substituteOptions,
  );
  const receiptNumber = vars.receipt_number;

  const html = `
  <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; color: #111827;">
    ${plainTextToHtml(bodyText)}
    <p style="margin:0;font-size:14px;color:#334155;">Your receipt (${receiptNumber}) is attached as a PDF.</p>
  </div>`;

  return { subject, html };
}
