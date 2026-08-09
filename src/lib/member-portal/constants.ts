/** HttpOnly cookie holding gym registration token during member Google OAuth. */
export const MEMBER_PORTAL_GYM_TOKEN_COOKIE = "member_portal_gym_token";

export const MEMBER_PORTAL_GYM_TOKEN_MAX_AGE_SEC = 600;

export function normalizeMemberEmail(email: string): string {
  return email.trim().toLowerCase();
}
