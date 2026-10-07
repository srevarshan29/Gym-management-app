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
import type { NutritionMemberFoodDoc } from "@/lib/firestore/types";
import {
  NUTRITION_MAX_FAVORITE_FOODS,
  NUTRITION_MAX_RECENT_FOODS,
} from "@/lib/nutrition/member-food-shortcuts";

export function nutritionMemberFoodDocId(
  gymId: string,
  memberId: string,
  foodId: string,
): string {
  const safeFoodId = foodId.replace(/\//g, "_");
  return `${gymId}__${memberId}__${safeFoodId}`;
}

export class NutritionMemberFoodsRepository extends TenantRepository<NutritionMemberFoodDoc> {
  constructor(db: Firestore) {
    super(db, COLLECTIONS.nutritionMemberFoods);
  }

  async getForMemberFood(
    ctx: FirestoreContext,
    gymId: string,
    memberId: string,
    foodId: string,
  ): Promise<DocWithId<NutritionMemberFoodDoc> | null> {
    const id = nutritionMemberFoodDocId(gymId, memberId, foodId);
    return this.getById(ctx, gymId, id);
  }

  async recordFoodLogged(
    ctx: FirestoreContext,
    gymId: string,
    memberId: string,
    foodId: string,
  ): Promise<void> {
    assertTenantAccess(ctx, gymId);
    assertMemberSelfAccess(ctx, memberId);

    const id = nutritionMemberFoodDocId(gymId, memberId, foodId);
    const now = Timestamp.now();
    const ref = this.docRef(id);
    const existing = await ref.get();

    const existingData = existing.exists ? existing.data() : undefined;
    const payload = omitUndefined({
      gymId,
      memberId,
      foodId,
      lastLoggedAt: now,
      isFavorite: existingData?.isFavorite === true,
      favoritedAt: (existingData?.favoritedAt as Timestamp | undefined) ?? null,
      ...(existing.exists
        ? { ...touchUpdatedAt(), createdAt: existingData?.createdAt as Timestamp }
        : serverTimestamps()),
    }) as WithFieldValue<NutritionMemberFoodDoc>;

    await ref.set(payload, { merge: true });
  }

  async setFavorite(
    ctx: FirestoreContext,
    gymId: string,
    memberId: string,
    foodId: string,
    isFavorite: boolean,
  ): Promise<DocWithId<NutritionMemberFoodDoc>> {
    assertTenantAccess(ctx, gymId);
    assertMemberSelfAccess(ctx, memberId);

    const id = nutritionMemberFoodDocId(gymId, memberId, foodId);
    const ref = this.docRef(id);
    const existing = await ref.get();
    const now = Timestamp.now();

    const existingData = existing.exists ? existing.data() : undefined;
    const payload = omitUndefined({
      gymId,
      memberId,
      foodId,
      isFavorite,
      favoritedAt: isFavorite ? now : null,
      lastLoggedAt:
        (existingData?.lastLoggedAt as Timestamp | undefined) ?? null,
      ...(existing.exists
        ? { ...touchUpdatedAt(), createdAt: existingData?.createdAt as Timestamp }
        : serverTimestamps()),
    }) as WithFieldValue<NutritionMemberFoodDoc>;

    await ref.set(payload, { merge: true });
    const doc = await this.getById(ctx, gymId, id);
    return this.assertDocBelongsToGym(ctx, doc, gymId);
  }

  async listRecentForMember(
    ctx: FirestoreContext,
    gymId: string,
    memberId: string,
    limit = NUTRITION_MAX_RECENT_FOODS,
  ): Promise<DocWithId<NutritionMemberFoodDoc>[]> {
    assertTenantAccess(ctx, gymId);
    assertMemberSelfAccess(ctx, memberId);

    const snap = await this.collection()
      .where("gymId", "==", gymId)
      .where("memberId", "==", memberId)
      .orderBy("lastLoggedAt", "desc")
      .limit(limit)
      .get();

    return snap.docs
      .map((d) => this.fromSnapshot(d.id, d.data()))
      .filter((d): d is DocWithId<NutritionMemberFoodDoc> => d !== null)
      .filter((d) => d.lastLoggedAt != null);
  }

  async listFavoritesForMember(
    ctx: FirestoreContext,
    gymId: string,
    memberId: string,
    limit = NUTRITION_MAX_FAVORITE_FOODS,
  ): Promise<DocWithId<NutritionMemberFoodDoc>[]> {
    assertTenantAccess(ctx, gymId);
    assertMemberSelfAccess(ctx, memberId);

    const snap = await this.collection()
      .where("gymId", "==", gymId)
      .where("memberId", "==", memberId)
      .where("isFavorite", "==", true)
      .orderBy("favoritedAt", "desc")
      .limit(limit)
      .get();

    return snap.docs
      .map((d) => this.fromSnapshot(d.id, d.data()))
      .filter((d): d is DocWithId<NutritionMemberFoodDoc> => d !== null);
  }
}
