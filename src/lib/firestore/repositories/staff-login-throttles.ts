import { Timestamp, type Firestore } from "firebase-admin/firestore";

import { COLLECTIONS } from "@/lib/firestore/collections";
import { omitUndefined } from "@/lib/firestore/serialize";

export type StaffLoginThrottleDoc = {
  failCount: number;
  windowEndsAt: Timestamp;
};

export type ThrottleBucket = {
  failCount: number;
  windowEndsAt: Date;
};

/**
 * Platform-scoped login throttle buckets — Admin SDK only (rules deny client access).
 */
export class StaffLoginThrottlesRepository {
  constructor(private readonly db: Firestore) {}

  private docRef(key: string) {
    return this.db.collection(COLLECTIONS.staffLoginThrottles).doc(key);
  }

  async readBucket(key: string): Promise<ThrottleBucket | null> {
    const snap = await this.docRef(key).get();
    if (!snap.exists) return null;
    const data = snap.data() as StaffLoginThrottleDoc;
    return {
      failCount: data.failCount,
      windowEndsAt: data.windowEndsAt.toDate(),
    };
  }

  async bumpBucket(key: string, windowMs: number, now: Date): Promise<void> {
    const existing = await this.readBucket(key);

    if (!existing || existing.windowEndsAt.getTime() <= now.getTime()) {
      await this.docRef(key).set(
        omitUndefined({
          failCount: 1,
          windowEndsAt: Timestamp.fromDate(
            new Date(now.getTime() + windowMs),
          ),
        }),
      );
      return;
    }

    await this.docRef(key).update({
      failCount: existing.failCount + 1,
    });
  }

  async clearBuckets(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    const batch = this.db.batch();
    for (const key of keys) {
      batch.delete(this.docRef(key));
    }
    await batch.commit();
  }
}
