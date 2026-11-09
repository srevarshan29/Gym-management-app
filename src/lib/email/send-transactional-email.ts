import { Resend } from "resend";

let cachedResend: Resend | null | undefined;

function getResend(): Resend | null {
  if (cachedResend !== undefined) return cachedResend;
  const key = process.env.RESEND_API_KEY?.trim();
  cachedResend = key ? new Resend(key) : null;
  return cachedResend;
}

export function isTransactionalEmailConfigured(): boolean {
  return getResend() !== null;
}

export type TransactionalEmailSendResult =
  | { outcome: "sent" }
  | { outcome: "skipped"; reason: "not_configured" }
  | { outcome: "failed"; message: string };

export async function sendTransactionalEmail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<TransactionalEmailSendResult> {
  const resend = getResend();
  if (!resend) {
    console.log(
      `[email] Skipped (no RESEND_API_KEY) -> ${params.to}: ${params.subject}`,
    );
    return { outcome: "skipped", reason: "not_configured" };
  }

  const from = process.env.RESEND_FROM_EMAIL || "Gym Receipts <onboarding@resend.dev>";
  const { error } = await resend.emails.send({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
  });

  if (error) {
    console.error("[email] Resend send failed:", { to: params.to, error });
    return {
      outcome: "failed",
      message: error.message ?? "Resend send failed",
    };
  }

  return { outcome: "sent" };
}

/** @deprecated Prefer checking {@link TransactionalEmailSendResult.outcome}; kept for callers that expect throws on failure. */
export async function sendTransactionalEmailOrThrow(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  const result = await sendTransactionalEmail(params);
  if (result.outcome === "failed") {
    throw new Error(result.message);
  }
}
