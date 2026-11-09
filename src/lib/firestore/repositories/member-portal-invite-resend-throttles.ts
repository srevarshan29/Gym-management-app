import { Timestamp, type Firestore } from "firebase-admin/firestore";

import { COLLECTIONS } from "@/lib/firestore/collections";
import { omitUndefined } from "@/lib/firestore/serialize";
import type { RateLimitResult } from "@/lib/rate-limit";

export type MemberPortalInviteResendThrottleDoc = {
  count: number;
  windowEndsAt: Timestamp;
};

export function buildMemberPortalInviteResendThrottleKey(
  gymId: string,
  memberId: string,
): string {
  return `${gymId}__${memberId}`;
}

/**
 * Durable resend rate limit — shared across Vercel instances (5 / 15 min per member).
 */
export class MemberPortalInviteResendThrottlesRepository {
  constructor(private readonly db: Firestore) {}

  private docRef(gymId: string, memberId: string) {
    const id = buildMemberPortalInviteResendThrottleKey(gymId, memberId);
    return this.db.collection(COLLECTIONS.memberPortalInviteResendThrottles).doc(id);
  }

  async checkAndConsume(
    gymId: string,
    memberId: string,
    limit: number,
    windowMs: number,
    now: Date = new Date(),
  ): Promise<RateLimitResult> {
    const ref = this.docRef(gymId, memberId);

    return this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const nowMs = now.getTime();

      if (!snap.exists) {
        tx.set(
          ref,
          omitUndefined({
            count: 1,
            windowEndsAt: Timestamp.fromDate(new Date(nowMs + windowMs)),
          } satisfies MemberPortalInviteResendThrottleDoc),
        );
        return { ok: true as const };
      }

      const data = snap.data() as MemberPortalInviteResendThrottleDoc;
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
}
