function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildMemberPortalWelcomeEmail(params: {
  memberName: string;
  memberEmail: string;
  gymName: string;
  portalLoginUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = `Welcome to ${params.gymName} — Your Member Portal`;

  const text = [
    `Hi ${params.memberName},`,
    "",
    `Welcome to ${params.gymName}! We're excited to have you join our fitness community.`,
    "",
    "Your Member Portal is ready.",
    "",
    "With your portal, you can:",
    "",
    "- View your membership and payment details",
    "- Access workout and diet plans",
    "- Track water intake and fitness goals",
    "- View gym attendance",
    "",
    params.portalLoginUrl,
    "",
    `Sign in with Google using your registered email address: ${params.memberEmail}.`,
    "",
    "See you at the gym!",
    "",
    `${params.gymName} Team`,
    "",
    "Powered by GymDesk",
  ].join("\n");

  const safeName = escapeHtml(params.memberName);
  const safeGym = escapeHtml(params.gymName);
  const safeEmail = escapeHtml(params.memberEmail);
  const safeUrl = escapeHtml(params.portalLoginUrl);

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="padding:32px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;font-size:16px;line-height:1.6;">
              <p style="margin:0 0 16px;">Hi ${safeName},</p>
              <p style="margin:0 0 16px;">Welcome to <strong>${safeGym}</strong>! We're excited to have you join our fitness community.</p>
              <p style="margin:0 0 16px;"><strong>Your Member Portal is ready.</strong></p>
              <p style="margin:0 0 8px;">With your portal, you can:</p>
              <ul style="margin:0 0 24px;padding-left:20px;">
                <li>View your membership and payment details</li>
                <li>Access workout and diet plans</li>
                <li>Track water intake and fitness goals</li>
                <li>View gym attendance</li>
              </ul>
              <p style="margin:0 0 24px;text-align:center;">
                <a href="${safeUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;padding:14px 28px;border-radius:8px;">Open My Member Portal</a>
              </p>
              <p style="margin:0 0 16px;font-size:14px;color:#4b5563;">Sign in with Google using your registered email address: <strong>${safeEmail}</strong>.</p>
              <p style="margin:0 0 24px;">See you at the gym!</p>
              <p style="margin:0 0 8px;">${safeGym} Team</p>
              <p style="margin:0;font-size:12px;color:#9ca3af;">Powered by GymDesk</p>
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
