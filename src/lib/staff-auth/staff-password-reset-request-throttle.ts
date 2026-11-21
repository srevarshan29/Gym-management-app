import { createHash } from "crypto";

import { getRepositories } from "@/lib/firestore";
import {
  STAFF_PASSWORD_RESET_EMAIL_WINDOW_MS,
} from "@/lib/firestore/repositories/staff-password-reset-request-throttles";
import type { RateLimitResult } from "@/lib/rate-limit";

function hashThrottlePart(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 40);
}

export function staffPasswordResetEmailThrottleKey(email: string): string {
  return `staff-pwd-reset:email:${hashThrottlePart(email.trim().toLowerCase())}`;
}

export function staffPasswordResetIpThrottleKey(ip: string): string {
  return `staff-pwd-reset:ip:${hashThrottlePart(ip)}`;
}

export async function checkStaffPasswordResetRequestThrottle(
  email: string,
  ip: string,
  now: Date = new Date(),
): Promise<RateLimitResult> {
  const { staffPasswordResetRequestThrottles } = getRepositories();
  try {
    return await staffPasswordResetRequestThrottles.checkAndConsume(
      {
        emailKey: staffPasswordResetEmailThrottleKey(email),
        ipKey: staffPasswordResetIpThrottleKey(ip),
      },
      now,
    );
  } catch (error) {
    console.error(
      "[staff-password-reset] throttle check failed; blocking request",
      error,
    );
    return { ok: false, retryAfterMs: STAFF_PASSWORD_RESET_EMAIL_WINDOW_MS };
  }
}
