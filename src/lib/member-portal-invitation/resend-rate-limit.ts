import { getRepositories } from "@/lib/firestore";
import type { RateLimitResult } from "@/lib/rate-limit";

export const RESEND_LIMIT = 5;
export const RESEND_WINDOW_MS = 15 * 60 * 1000;

export async function consumeMemberPortalInviteResendAllowance(
  gymId: string,
  memberId: string,
): Promise<RateLimitResult> {
  const { memberPortalInviteResendThrottles } = getRepositories();
  return memberPortalInviteResendThrottles.checkAndConsume(
    gymId,
    memberId,
    RESEND_LIMIT,
    RESEND_WINDOW_MS,
  );
}
