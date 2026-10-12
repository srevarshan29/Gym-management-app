import { Timestamp, type Firestore, type WithFieldValue } from "firebase-admin/firestore";

import { COLLECTIONS } from "@/lib/firestore/collections";
import {
  assertMemberSelfAccess,
  assertTenantAccess,
  type FirestoreContext,
} from "@/lib/firestore/context";
import type { DocWithId } from "@/lib/firestore/repositories/base";
import { TenantRepository } from "@/lib/firestore/repositories/base";
import { omitUndefined, serverTimestamps, touchUpdatedAt } from "@/lib/firestore/serialize";
import type { MemberPortalDashboardStateDoc } from "@/lib/firestore/types";

export function memberPortalDashboardStateDocId(
  gymId: string,
  memberId: string,
): string {
  return `${gymId}__${memberId}`;
}

const MAX_RECENT_MESSAGE_KEYS = 24;

export type DashboardStatePatch = {
  greetingDateKey?: string | null;
  greetingMessageKey?: string | null;
  recentMessageKeys?: string[];
  celebratedCalorieDateKey?: string | null;
  celebratedWaterDateKey?: string | null;
};

export class MemberPortalDashboardStateRepository extends TenantRepository<MemberPortalDashboardStateDoc> {
  constructor(db: Firestore) {
    super(db, COLLECTIONS.memberPortalDashboardState);
  }

  async getForMember(
    ctx: FirestoreContext,
    gymId: string,
    memberId: string,
  ): Promise<DocWithId<MemberPortalDashboardStateDoc> | null> {
    const id = memberPortalDashboardStateDocId(gymId, memberId);
    return this.getById(ctx, gymId, id);
  }

  async mergeForMember(
    ctx: FirestoreContext,
    gymId: string,
    memberId: string,
    patch: DashboardStatePatch,
  ): Promise<DocWithId<MemberPortalDashboardStateDoc>> {
    assertTenantAccess(ctx, gymId);
    assertMemberSelfAccess(ctx, memberId);

    const id = memberPortalDashboardStateDocId(gymId, memberId);
    const ref = this.docRef(id);
    const existing = await ref.get();

    const recentMessageKeys =
      patch.recentMessageKeys?.slice(-MAX_RECENT_MESSAGE_KEYS) ??
      (existing.exists
        ? ((existing.data() as MemberPortalDashboardStateDoc).recentMessageKeys ??
          [])
        : []);

    const payload = omitUndefined({
      gymId,
      memberId,
      greetingDateKey:
        patch.greetingDateKey !== undefined
          ? patch.greetingDateKey
          : existing.exists
            ? (existing.data() as MemberPortalDashboardStateDoc).greetingDateKey
            : null,
      greetingMessageKey:
        patch.greetingMessageKey !== undefined
          ? patch.greetingMessageKey
          : existing.exists
            ? (existing.data() as MemberPortalDashboardStateDoc).greetingMessageKey
            : null,
      recentMessageKeys,
      celebratedCalorieDateKey:
        patch.celebratedCalorieDateKey !== undefined
          ? patch.celebratedCalorieDateKey
          : existing.exists
            ? (existing.data() as MemberPortalDashboardStateDoc)
                .celebratedCalorieDateKey
            : null,
      celebratedWaterDateKey:
        patch.celebratedWaterDateKey !== undefined
          ? patch.celebratedWaterDateKey
          : existing.exists
            ? (existing.data() as MemberPortalDashboardStateDoc)
                .celebratedWaterDateKey
            : null,
      ...(existing.exists
        ? touchUpdatedAt()
        : {
            ...serverTimestamps(),
            updatedAt: Timestamp.now(),
          }),
    }) as WithFieldValue<MemberPortalDashboardStateDoc>;

    await ref.set(payload, { merge: true });
    const doc = await this.getById(ctx, gymId, id);
    return this.assertDocBelongsToGym(ctx, doc, gymId);
  }
}
