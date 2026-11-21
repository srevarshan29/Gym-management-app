import { Timestamp, type Firestore, type WithFieldValue } from "firebase-admin/firestore";

import { COLLECTIONS } from "@/lib/firestore/collections";
import {
  assertMemberSelfAccess,
  assertTenantAccess,
  type FirestoreContext,
} from "@/lib/firestore/context";
import { newDocId } from "@/lib/firestore/helpers";
import type { DocWithId } from "@/lib/firestore/repositories/base";
import { TenantRepository } from "@/lib/firestore/repositories/base";
import { omitUndefined, serverTimestamps } from "@/lib/firestore/serialize";
import type { MemberWeightMeasurementDoc } from "@/lib/firestore/types";
import { assertValidWeightKg } from "@/lib/weight-journey/progress";

const LIST_LIMIT = 200;

export class MemberWeightMeasurementsRepository extends TenantRepository<MemberWeightMeasurementDoc> {
  constructor(db: Firestore) {
    super(db, COLLECTIONS.memberWeightMeasurements);
  }

  assertMemberReadAccess(
    ctx: FirestoreContext,
    gymId: string,
    memberId: string,
  ): void {
    assertTenantAccess(ctx, gymId);
    assertMemberSelfAccess(ctx, memberId);
  }

  async listForMember(
    ctx: FirestoreContext,
    gymId: string,
    memberId: string,
  ): Promise<DocWithId<MemberWeightMeasurementDoc>[]> {
    assertTenantAccess(ctx, gymId);
    if (ctx.kind === "member") {
      assertMemberSelfAccess(ctx, memberId);
    }

    const snap = await this.collection()
      .where("gymId", "==", gymId)
      .where("memberId", "==", memberId)
      .orderBy("recordedAt", "asc")
      .limit(LIST_LIMIT)
      .get();

    return snap.docs
      .map((d) => this.fromSnapshot(d.id, d.data()))
      .filter((d): d is DocWithId<MemberWeightMeasurementDoc> => d !== null);
  }

  async addMeasurement(
    ctx: FirestoreContext,
    gymId: string,
    memberId: string,
    weightKg: number,
    recordedAt: Date = new Date(),
  ): Promise<DocWithId<MemberWeightMeasurementDoc>> {
    assertTenantAccess(ctx, gymId);
    assertMemberSelfAccess(ctx, memberId);

    const kg = assertValidWeightKg(weightKg);
    const id = newDocId();
    const payload: WithFieldValue<MemberWeightMeasurementDoc> = omitUndefined({
      gymId,
      memberId,
      weightKg: kg,
      recordedAt: Timestamp.fromDate(recordedAt),
      ...serverTimestamps(),
    });

    await this.docRef(id).create(payload);
    const created = await this.getById(ctx, gymId, id);
    return this.assertDocBelongsToGym(ctx, created, gymId);
  }
}
