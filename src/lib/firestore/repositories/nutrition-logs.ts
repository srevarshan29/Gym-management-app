import type { Firestore, WithFieldValue } from "firebase-admin/firestore";

import { COLLECTIONS } from "@/lib/firestore/collections";
import {
  assertMemberSelfAccess,
  assertTenantAccess,
  type FirestoreContext,
} from "@/lib/firestore/context";
import type { DocWithId } from "@/lib/firestore/repositories/base";
import { TenantRepository } from "@/lib/firestore/repositories/base";
import { omitUndefined, serverTimestamps } from "@/lib/firestore/serialize";
import type { NutritionLogDoc, NutritionMealType } from "@/lib/firestore/types";

export type CreateNutritionLogInput = {
  memberId: string;
  logDate: string;
  mealType: NutritionMealType;
  foodId: string;
  foodName: string;
  quantityGrams: number;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams: number;
};

export class NutritionLogsRepository extends TenantRepository<NutritionLogDoc> {
  constructor(db: Firestore) {
    super(db, COLLECTIONS.nutritionLogs);
  }

  async listForMemberOnDate(
    ctx: FirestoreContext,
    gymId: string,
    memberId: string,
    logDate: string,
  ): Promise<DocWithId<NutritionLogDoc>[]> {
    assertTenantAccess(ctx, gymId);
    assertMemberSelfAccess(ctx, memberId);

    const snap = await this.collection()
      .where("gymId", "==", gymId)
      .where("memberId", "==", memberId)
      .where("logDate", "==", logDate)
      .get();

    return snap.docs
      .map((d) => this.fromSnapshot(d.id, d.data()))
      .filter((d): d is DocWithId<NutritionLogDoc> => d !== null)
      .sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis());
  }

  async createLog(
    ctx: FirestoreContext,
    gymId: string,
    id: string,
    input: CreateNutritionLogInput,
  ): Promise<DocWithId<NutritionLogDoc>> {
    assertTenantAccess(ctx, gymId);
    assertMemberSelfAccess(ctx, input.memberId);

    const payload: WithFieldValue<NutritionLogDoc> = omitUndefined({
      gymId,
      memberId: input.memberId,
      logDate: input.logDate,
      mealType: input.mealType,
      foodId: input.foodId,
      foodName: input.foodName,
      quantityGrams: input.quantityGrams,
      calories: input.calories,
      proteinGrams: input.proteinGrams,
      carbsGrams: input.carbsGrams,
      fatGrams: input.fatGrams,
      fiberGrams: input.fiberGrams,
      ...serverTimestamps(),
    });

    await this.docRef(id).set(payload);
    const created = await this.getById(ctx, gymId, id);
    return this.assertDocBelongsToGym(ctx, created, gymId);
  }

  async deleteLog(
    ctx: FirestoreContext,
    gymId: string,
    memberId: string,
    logId: string,
  ): Promise<void> {
    assertTenantAccess(ctx, gymId);
    assertMemberSelfAccess(ctx, memberId);

    const existing = await this.getById(ctx, gymId, logId);
    const doc = this.assertDocBelongsToGym(ctx, existing, gymId);
    if (doc.memberId !== memberId) {
      throw new Error("Member isolation violation: memberId mismatch.");
    }

    await this.docRef(logId).delete();
  }
}
