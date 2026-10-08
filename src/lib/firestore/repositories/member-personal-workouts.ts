import { Timestamp, type Firestore } from "firebase-admin/firestore";

import { COLLECTIONS } from "@/lib/firestore/collections";
import {
  assertMemberSelfAccess,
  assertTenantAccess,
  type FirestoreContext,
} from "@/lib/firestore/context";
import { DocumentNotFoundError } from "@/lib/firestore/errors";
import type { DocWithId } from "@/lib/firestore/repositories/base";
import { TenantRepository } from "@/lib/firestore/repositories/base";
import { omitUndefined, serverTimestamps, touchUpdatedAt } from "@/lib/firestore/serialize";
import type {
  MemberPersonalWorkoutDoc,
  MemberPersonalWorkoutExerciseEmbedded,
} from "@/lib/firestore/types";

export type SaveMemberPersonalWorkoutInput = {
  name: string;
  exercises: MemberPersonalWorkoutExerciseEmbedded[];
};

export class MemberPersonalWorkoutsRepository extends TenantRepository<MemberPersonalWorkoutDoc> {
  constructor(db: Firestore) {
    super(db, COLLECTIONS.memberPersonalWorkouts);
  }

  async listForMember(
    ctx: FirestoreContext,
    gymId: string,
    memberId: string,
    limit = 50,
  ): Promise<DocWithId<MemberPersonalWorkoutDoc>[]> {
    assertTenantAccess(ctx, gymId);
    assertMemberSelfAccess(ctx, memberId);

    const snap = await this.collection()
      .where("gymId", "==", gymId)
      .where("memberId", "==", memberId)
      .orderBy("updatedAt", "desc")
      .limit(limit)
      .get();

    return snap.docs
      .map((d) => this.fromSnapshot(d.id, d.data()))
      .filter((d): d is DocWithId<MemberPersonalWorkoutDoc> => d !== null);
  }

  async getForMember(
    ctx: FirestoreContext,
    gymId: string,
    memberId: string,
    workoutId: string,
  ): Promise<DocWithId<MemberPersonalWorkoutDoc> | null> {
    const doc = await this.getById(ctx, gymId, workoutId);
    if (!doc || doc.memberId !== memberId) {
      return null;
    }
    return doc;
  }

  async createForMember(
    ctx: FirestoreContext,
    gymId: string,
    memberId: string,
    id: string,
    input: SaveMemberPersonalWorkoutInput,
  ): Promise<DocWithId<MemberPersonalWorkoutDoc>> {
    assertTenantAccess(ctx, gymId);
    assertMemberSelfAccess(ctx, memberId);

    const timestamps = serverTimestamps();
    return this.create(ctx, gymId, id, {
      gymId,
      memberId,
      name: input.name.trim(),
      exercises: input.exercises,
      createdAt: timestamps.createdAt,
      updatedAt: timestamps.updatedAt,
    });
  }

  async updateForMember(
    ctx: FirestoreContext,
    gymId: string,
    memberId: string,
    workoutId: string,
    input: SaveMemberPersonalWorkoutInput,
  ): Promise<DocWithId<MemberPersonalWorkoutDoc>> {
    assertTenantAccess(ctx, gymId);
    assertMemberSelfAccess(ctx, memberId);

    const existing = await this.getForMember(ctx, gymId, memberId, workoutId);
    if (!existing) {
      throw new DocumentNotFoundError(
        COLLECTIONS.memberPersonalWorkouts,
        workoutId,
      );
    }

    const patch = omitUndefined({
      name: input.name.trim(),
      exercises: input.exercises,
      ...touchUpdatedAt(),
    });

    await this.docRef(workoutId).update(patch);

    return {
      ...existing,
      ...patch,
      updatedAt: patch.updatedAt as Timestamp,
    };
  }

  async deleteForMember(
    ctx: FirestoreContext,
    gymId: string,
    memberId: string,
    workoutId: string,
  ): Promise<void> {
    const existing = await this.getForMember(ctx, gymId, memberId, workoutId);
    if (!existing) {
      throw new DocumentNotFoundError(
        COLLECTIONS.memberPersonalWorkouts,
        workoutId,
      );
    }
    await this.delete(ctx, gymId, workoutId);
  }
}
