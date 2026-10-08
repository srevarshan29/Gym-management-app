import { Timestamp, type Firestore, type WithFieldValue } from "firebase-admin/firestore";

import { COLLECTIONS } from "@/lib/firestore/collections";
import {
  assertMemberSelfAccess,
  assertTenantAccess,
  type FirestoreContext,
} from "@/lib/firestore/context";
import type { DocWithId } from "@/lib/firestore/repositories/base";
import { TenantRepository } from "@/lib/firestore/repositories/base";
import {
  omitUndefined,
  serverTimestamps,
  touchUpdatedAt,
} from "@/lib/firestore/serialize";
import type { NutritionMemberSettingsDoc } from "@/lib/firestore/types";
import { parseValidDailyCalorieTarget } from "@/lib/nutrition/nutrition-calorie-target";

export function nutritionMemberSettingsDocId(
  gymId: string,
  memberId: string,
): string {
  return `${gymId}__${memberId}`;
}

export class NutritionMemberSettingsRepository extends TenantRepository<NutritionMemberSettingsDoc> {
  constructor(db: Firestore) {
    super(db, COLLECTIONS.nutritionMemberSettings);
  }

  async getForMember(
    ctx: FirestoreContext,
    gymId: string,
    memberId: string,
  ): Promise<DocWithId<NutritionMemberSettingsDoc> | null> {
    const id = nutritionMemberSettingsDocId(gymId, memberId);
    return this.getById(ctx, gymId, id);
  }

  async setCustomDailyCalorieTarget(
    ctx: FirestoreContext,
    gymId: string,
    memberId: string,
    dailyCalorieTarget: number | null,
  ): Promise<DocWithId<NutritionMemberSettingsDoc>> {
    assertTenantAccess(ctx, gymId);
    assertMemberSelfAccess(ctx, memberId);

    const normalized =
      dailyCalorieTarget == null
        ? null
        : parseValidDailyCalorieTarget(dailyCalorieTarget);
    if (dailyCalorieTarget != null && normalized == null) {
      throw new Error("Invalid daily calorie target.");
    }

    const id = nutritionMemberSettingsDocId(gymId, memberId);
    const ref = this.docRef(id);
    const existing = await ref.get();

    const payload = omitUndefined({
      gymId,
      memberId,
      customDailyCalorieTarget: normalized,
      ...(existing.exists
        ? { ...touchUpdatedAt(), createdAt: existing.data()?.createdAt as Timestamp }
        : serverTimestamps()),
    }) as WithFieldValue<NutritionMemberSettingsDoc>;

    await ref.set(payload, { merge: true });
    const saved = await ref.get();
    const doc = this.fromSnapshot(saved.id, saved.data());
    if (!doc) {
      throw new Error("Failed to save nutrition settings.");
    }
    return doc;
  }
}
