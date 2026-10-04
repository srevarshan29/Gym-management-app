import { Resend } from "resend";

let cachedResend: Resend | null | undefined;

function getResend(): Resend | null {
  if (cachedResend !== undefined) return cachedResend;
  const key = process.env.RESEND_API_KEY;
  cachedResend = key ? new Resend(key) : null;
  return cachedResend;
}

export async function sendTransactionalEmail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.log(
      `[email] Skipped (no RESEND_API_KEY) -> ${params.to}: ${params.subject}`,
    );
    return;
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
    throw new Error(error.message ?? "Resend send failed");
  }
}
