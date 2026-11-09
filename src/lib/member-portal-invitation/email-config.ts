/** True on Vercel production or NODE_ENV production. */
export function isLiveProductionEnvironment(): boolean {
  if (process.env.VERCEL_ENV === "production") return true;
  if (process.env.NODE_ENV === "production" && process.env.VERCEL_ENV !== "preview") {
    return true;
  }
  return false;
}

function resendDevSender(from: string): boolean {
  return /@resend\.dev/i.test(from);
}

/**
 * Member portal invitations require a verified production sender — never the Resend onboarding address in live production.
 */
export function isMemberPortalInvitationEmailConfigured(): boolean {
  if (!process.env.RESEND_API_KEY?.trim()) return false;

  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!from) return false;

  if (isLiveProductionEnvironment() && resendDevSender(from)) {
    return false;
  }

  return true;
}

export function resolveMemberPortalInvitationFromAddress(): string | null {
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!from) return null;
  if (isLiveProductionEnvironment() && resendDevSender(from)) return null;
  return from;
}
