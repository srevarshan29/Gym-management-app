function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatExpiration(expiresAt: Date): string {
  return expiresAt.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });
}

export function buildStaffPasswordResetEmail(params: {
  resetUrl: string;
  expiresAt: Date;
}): { subject: string; html: string; text: string } {
  const subject = "Reset your GymDesk staff password";
  const expirationText = `${formatExpiration(params.expiresAt)} UTC`;
  const safeUrl = escapeHtml(params.resetUrl);

  const text = [
    "GymDesk staff password reset",
    "",
    "We received a request to reset your staff account password.",
    "",
    `Reset your password (expires ${expirationText}):`,
    params.resetUrl,
    "",
    "This link can only be used once and expires in 30 minutes.",
    "",
    "If you did not request this, you can ignore this email.",
    "",
    "GymDesk",
  ].join("\n");

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0a0a0a;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#111827;border-radius:12px;overflow:hidden;border:1px solid #1f2937;">
          <tr>
            <td style="padding:32px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#f9fafb;font-size:16px;line-height:1.6;">
              <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#9ca3af;">GymDesk</p>
              <p style="margin:0 0 16px;font-size:22px;font-weight:700;">Reset your staff password</p>
              <p style="margin:0 0 16px;color:#d1d5db;">We received a request to reset your staff account password. Use the button below to choose a new password.</p>
              <p style="margin:0 0 24px;text-align:center;">
                <a href="${safeUrl}" style="display:inline-block;background:#f9fafb;color:#111827;text-decoration:none;font-weight:600;font-size:16px;padding:14px 28px;border-radius:8px;">Reset password</a>
              </p>
              <p style="margin:0 0 16px;font-size:14px;color:#9ca3af;">This link expires at <strong style="color:#e5e7eb;">${escapeHtml(expirationText)}</strong> and can only be used once.</p>
              <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">If you did not request a password reset, you can safely ignore this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  return { subject, html, text };
}