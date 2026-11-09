import { Resend } from "resend";

import {
  isMemberPortalInvitationEmailConfigured,
  resolveMemberPortalInvitationFromAddress,
} from "@/lib/member-portal-invitation/email-config";

let cachedResend: Resend | null | undefined;

function getResend(): Resend | null {
  if (cachedResend !== undefined) return cachedResend;
  const key = process.env.RESEND_API_KEY?.trim();
  cachedResend = key ? new Resend(key) : null;
  return cachedResend;
}

export type MemberPortalInvitationEmailSendResult =
  | { outcome: "sent"; providerMessageId: string }
  | { outcome: "skipped"; reason: "not_configured" }
  | { outcome: "failed"; message: string };

export async function sendMemberPortalInvitationEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
}): Promise<MemberPortalInvitationEmailSendResult> {
  if (!isMemberPortalInvitationEmailConfigured()) {
    console.log(
      `[email] Member portal invitation skipped (email not configured for live send) -> ${params.to}`,
    );
    return { outcome: "skipped", reason: "not_configured" };
  }

  const from = resolveMemberPortalInvitationFromAddress();
  if (!from) {
    return { outcome: "skipped", reason: "not_configured" };
  }

  const resend = getResend();
  if (!resend) {
    return { outcome: "skipped", reason: "not_configured" };
  }

  const { data, error } = await resend.emails.send(
    {
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    },
    { idempotencyKey: params.idempotencyKey },
  );

  if (error) {
    console.error("[email] Member portal invitation send failed:", {
      to: params.to,
      error,
    });
    return {
      outcome: "failed",
      message: error.message ?? "Resend send failed",
    };
  }

  const providerMessageId = data?.id?.trim();
  if (!providerMessageId) {
    return {
      outcome: "failed",
      message: "Resend accepted the request but did not return a message id.",
    };
  }

  return { outcome: "sent", providerMessageId };
}
