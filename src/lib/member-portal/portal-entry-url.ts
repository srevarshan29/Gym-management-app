/**
 * Stable gym-wide Member Portal entry URLs (QR / share link).
 * Uses the gym registration token only — never member PII.
 */

export function getMemberPortalLoginPath(registrationToken: string): string {
  const trimmed = registrationToken.trim();
  if (!trimmed) {
    throw new Error("registrationToken is required");
  }
  return `/member/login/${encodeURIComponent(trimmed)}`;
}

export function buildMemberPortalLoginUrl(
  baseUrl: string,
  registrationToken: string,
): string {
  const base = baseUrl.replace(/\/$/, "");
  return `${base}${getMemberPortalLoginPath(registrationToken)}`;
}

const FORBIDDEN_URL_FRAGMENTS =
  /memberId|memberNumber|email|phone|password|@/i;

/** Validates QR/share URLs contain no member-sensitive data. */
export function assertMemberPortalQrUrlIsSafe(url: string): void {
  const parsed = new URL(url);
  if (parsed.search || parsed.hash) {
    throw new Error("Member portal entry URL must not include query or hash");
  }
  const path = decodeURIComponent(parsed.pathname);
  if (!/^\/member\/login\/[^/]+$/.test(path)) {
    throw new Error("Member portal entry URL must be /member/login/{gymToken}");
  }
  const tokenSegment = path.split("/").pop() ?? "";
  if (!tokenSegment || FORBIDDEN_URL_FRAGMENTS.test(tokenSegment)) {
    throw new Error("Member portal entry URL token segment looks invalid");
  }
  if (FORBIDDEN_URL_FRAGMENTS.test(url)) {
    throw new Error("Member portal entry URL must not contain sensitive data");
  }
}
