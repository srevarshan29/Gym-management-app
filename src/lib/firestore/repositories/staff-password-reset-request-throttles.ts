import { Timestamp, type Firestore } from "firebase-admin/firestore";

import { COLLECTIONS } from "@/lib/firestore/collections";
import { omitUndefined } from "@/lib/firestore/serialize";
import type { RateLimitResult } from "@/lib/rate-limit";

export type StaffPasswordResetRequestThrottleDoc = {
  count: number;
  windowEndsAt: Timestamp;
};

export const STAFF_PASSWORD_RESET_EMAIL_LIMIT = 5;
export const STAFF_PASSWORD_RESET_EMAIL_WINDOW_MS = 15 * 60 * 1000;
export const STAFF_PASSWORD_RESET_IP_LIMIT = 20;
export const STAFF_PASSWORD_RESET_IP_WINDOW_MS = 15 * 60 * 1000;

/**
 * Durable forgot-password request throttle (email + IP buckets).
 */
export class StaffPasswordResetRequestThrottlesRepository {
  constructor(private readonly db: Firestore) {}

  private docRef(key: string) {
    return this.db.collection(COLLECTIONS.staffPasswordResetRequestThrottles).doc(key);
  }

  private async checkAndConsumeOne(
    key: string,
    limit: number,
    windowMs: number,
    now: Date,
  ): Promise<RateLimitResult> {
    const ref = this.docRef(key);

    return this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const nowMs = now.getTime();

      if (!snap.exists) {
        tx.set(
          ref,
          omitUndefined({
            count: 1,
            windowEndsAt: Timestamp.fromDate(new Date(nowMs + windowMs)),
          } satisfies StaffPasswordResetRequestThrottleDoc),
        );
        return { ok: true as const };
      }

      const data = snap.data() as StaffPasswordResetRequestThrottleDoc;
      const windowEndMs = data.windowEndsAt.toMillis();

      if (nowMs >= windowEndMs) {
        tx.set(
          ref,
          omitUndefined({
            count: 1,
            windowEndsAt: Timestamp.fromDate(new Date(nowMs + windowMs)),
          }),
        );
        return { ok: true as const };
      }

      if (data.count >= limit) {
        return { ok: false as const, retryAfterMs: windowEndMs - nowMs };
      }

      tx.update(ref, { count: data.count + 1 });
      return { ok: true as const };
    });
  }

  async checkAndConsume(
    keys: { emailKey: string; ipKey: string },
    now: Date = new Date(),
  ): Promise<RateLimitResult> {
    const emailResult = await this.checkAndConsumeOne(
      keys.emailKey,
      STAFF_PASSWORD_RESET_EMAIL_LIMIT,
      STAFF_PASSWORD_RESET_EMAIL_WINDOW_MS,
      now,
    );
    if (!emailResult.ok) {
      return emailResult;
    }

    return this.checkAndConsumeOne(
      keys.ipKey,
      STAFF_PASSWORD_RESET_IP_LIMIT,
      STAFF_PASSWORD_RESET_IP_WINDOW_MS,
      now,
    );
  }

  async readCount(key: string): Promise<number | null> {
    const snap = await this.docRef(key).get();
    if (!snap.exists) return null;
    return (snap.data() as StaffPasswordResetRequestThrottleDoc).count;
  }
}