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
import {
  dashboardStateNeedsPersist,
} from "@/lib/member-portal/dashboard-state-sync";
import type { MemberPortalDashboardStateDoc } from "@/lib/firestore/types";
import { measureServerPhase } from "@/lib/server-perf";

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
    options?: {
      /** When already loaded for message resolution, skips an extra read. */
      existingDoc?: DocWithId<MemberPortalDashboardStateDoc> | null;
    },
  ): Promise<DocWithId<MemberPortalDashboardStateDoc> | null> {
    return measureServerPhase("member.portal.dashboard.stateWrite", async () => {
    assertTenantAccess(ctx, gymId);
    assertMemberSelfAccess(ctx, memberId);

    const id = memberPortalDashboardStateDocId(gymId, memberId);
    const ref = this.docRef(id);
    const existingSnap =
      options?.existingDoc !== undefined
        ? null
        : await ref.get();
    const existingData =
      options?.existingDoc !== undefined
        ? options.existingDoc
        : existingSnap?.exists
          ? ({
              id,
              ...(existingSnap.data() as MemberPortalDashboardStateDoc),
            } satisfies DocWithId<MemberPortalDashboardStateDoc>)
          : null;

    if (!dashboardStateNeedsPersist(existingData, patch)) {
      return existingData;
    }

    const recentMessageKeys =
      patch.recentMessageKeys?.slice(-MAX_RECENT_MESSAGE_KEYS) ??
      (existingData?.recentMessageKeys ?? []);

    const payload = omitUndefined({
      gymId,
      memberId,
      greetingDateKey:
        patch.greetingDateKey !== undefined
          ? patch.greetingDateKey
          : (existingData?.greetingDateKey ?? null),
      greetingMessageKey:
        patch.greetingMessageKey !== undefined
          ? patch.greetingMessageKey
          : (existingData?.greetingMessageKey ?? null),
      recentMessageKeys,
      celebratedCalorieDateKey:
        patch.celebratedCalorieDateKey !== undefined
          ? patch.celebratedCalorieDateKey
          : (existingData?.celebratedCalorieDateKey ?? null),
      celebratedWaterDateKey:
        patch.celebratedWaterDateKey !== undefined
          ? patch.celebratedWaterDateKey
          : (existingData?.celebratedWaterDateKey ?? null),
      ...(existingData
        ? touchUpdatedAt()
        : {
            ...serverTimestamps(),
            updatedAt: Timestamp.now(),
          }),
    }) as WithFieldValue<MemberPortalDashboardStateDoc>;

    await ref.set(payload, { merge: true });
    const doc = await this.getById(ctx, gymId, id);
    return this.assertDocBelongsToGym(ctx, doc, gymId);
    });
  }
}
