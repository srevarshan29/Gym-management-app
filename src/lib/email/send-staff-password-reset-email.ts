import { sendTransactionalEmail } from "@/lib/email/send-transactional-email";
import { buildStaffPasswordResetEmail } from "@/lib/staff-auth/staff-password-reset-email-template";

export type StaffPasswordResetEmailSendResult =
  | { outcome: "sent" }
  | { outcome: "skipped"; reason: "not_configured" }
  | { outcome: "failed"; message: string };

export async function sendStaffPasswordResetEmail(params: {
  to: string;
  resetUrl: string;
  expiresAt: Date;
}): Promise<StaffPasswordResetEmailSendResult> {
  const { subject, html, text } = buildStaffPasswordResetEmail({
    resetUrl: params.resetUrl,
    expiresAt: params.expiresAt,
  });

  const result = await sendTransactionalEmail({
    to: params.to,
    subject,
    html,
    text,
  });

  if (result.outcome === "sent") {
    return { outcome: "sent" };
  }
  if (result.outcome === "skipped") {
    return { outcome: "skipped", reason: "not_configured" };
  }
  return { outcome: "failed", message: result.message };
}