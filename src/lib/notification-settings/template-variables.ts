/** Variables supported in Phase 3 (documented for owners in UI). */
export const NOTIFICATION_TEMPLATE_VARIABLES = [
  "member_name",
  "gym_name",
  "expiry_date",
  "days_remaining",
] as const;

/** Payment receipt emails also support receipt-specific tokens at send time. */
export const PAYMENT_RECEIPT_TEMPLATE_VARIABLES = [
  "receipt_number",
  ...NOTIFICATION_TEMPLATE_VARIABLES,
] as const;

export type NotificationTemplateVariables = Record<string, string>;

export function substituteNotificationTemplate(
  template: string,
  variables: NotificationTemplateVariables,
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

export function plainTextToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  return escaped
    .split(/\n\n+/)
    .map((block) => `<p style="margin:0 0 12px;line-height:1.5;">${block.replace(/\n/g, "<br/>")}</p>`)
    .join("");
}
