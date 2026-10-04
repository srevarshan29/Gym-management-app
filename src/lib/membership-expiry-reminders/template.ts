import { formatDate } from "@/lib/utils";

/** Phase 1 default copy — replace in Phase 2 with owner-editable templates. */
export function buildMembershipExpiryReminderEmail(params: {
  memberName: string;
  gymName: string;
  expiryDate: Date;
  daysRemaining: number;
}): { subject: string; html: string; text: string } {
  const expiryLabel = formatDate(params.expiryDate);
  const subject = `Membership expires in ${params.daysRemaining} days - ${params.gymName}`;

  const text = [
    `Hi ${params.memberName},`,
    "",
    `Your membership at ${params.gymName} expires on ${expiryLabel}.`,
    "",
    "Please renew your membership to continue your workouts without interruption.",
    "",
    `Thank you,`,
    params.gymName,
  ].join("\n");

  const html = `
  <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; color: #111827;">
    <p>Hi ${escapeHtml(params.memberName)},</p>
    <p>Your membership at <strong>${escapeHtml(params.gymName)}</strong> expires on <strong>${escapeHtml(expiryLabel)}</strong>.</p>
    <p>Please renew your membership to continue your workouts without interruption.</p>
    <p>Thank you,<br/>${escapeHtml(params.gymName)}</p>
  </div>`;

  return { subject, html, text };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
