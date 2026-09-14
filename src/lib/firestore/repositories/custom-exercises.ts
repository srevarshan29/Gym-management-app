import type { Firestore, WithFieldValue } from "firebase-admin/firestore";

import { COLLECTIONS } from "@/lib/firestore/collections";
import type { FirestoreContext } from "@/lib/firestore/context";
import { assertTenantAccess } from "@/lib/firestore/context";
import type { DocWithId } from "@/lib/firestore/repositories/base";
import { TenantRepository } from "@/lib/firestore/repositories/base";
import type {
  CustomExerciseDoc,
  ExerciseTrackingType,
  MuscleGroup,
} from "@/lib/firestore/types";

export type CreateCustomExerciseInput = {
  name: string;
  muscleGroup: MuscleGroup;
  defaultSets?: number | null;
  defaultReps?: string | null;
  defaultTempo?: string | null;
  defaultRestSeconds?: number | null;
  trackingType?: ExerciseTrackingType;
  isSeeded?: boolean;
};

export class CustomExercisesRepository extends TenantRepository<CustomExerciseDoc> {
  constructor(db: Firestore) {
    super(db, COLLECTIONS.customExercises);
  }

  async countByGym(ctx: FirestoreContext, gymId: string): Promise<number> {
    assertTenantAccess(ctx, gymId);
    const snap = await this.collection()
      .where("gymId", "==", gymId)
      .count()
      .get();
    return snap.data().count;
  }

  async findByNameLower(
    ctx: FirestoreContext,
    gymId: string,
    nameLower: string,
  ): Promise<DocWithId<CustomExerciseDoc> | null> {
    assertTenantAccess(ctx, gymId);
    const snap = await this.collection()
      .where("gymId", "==", gymId)
      .where("nameLower", "==", nameLower)
      .limit(1)
      .get();
    const doc = snap.docs[0];
    if (!doc) return null;
    return this.fromSnapshot(doc.id, doc.data());
  }

  /** @deprecated Prefer findByNameLower for duplicate checks. */
  async findByName(
    ctx: FirestoreContext,
    gymId: string,
    name: string,
  ): Promise<DocWithId<CustomExerciseDoc> | null> {
    return this.findByNameLower(ctx, gymId, name.trim().toLowerCase());
  }

  async listLibrary(
    ctx: FirestoreContext,
    gymId: string,
    muscleGroup?: MuscleGroup | null,
  ): Promise<DocWithId<CustomExerciseDoc>[]> {
    if (muscleGroup) {
      return this.listByMuscleGroup(ctx, gymId, muscleGroup);
    }

    assertTenantAccess(ctx, gymId);
    const snap = await this.collection()
      .where("gymId", "==", gymId)
      .orderBy("name", "asc")
      .get();
    const rows = snap.docs
      .map((d) => this.fromSnapshot(d.id, d.data()))
      .filter((d): d is DocWithId<CustomExerciseDoc> => d !== null);

    return rows.sort((a, b) => {
      const byGroup = a.muscleGroup.localeCompare(b.muscleGroup);
      return byGroup !== 0 ? byGroup : a.name.localeCompare(b.name);
    });
  }

  async listByMuscleGroup(
    ctx: FirestoreContext,
    gymId: string,
    muscleGroup: MuscleGroup,
  ): Promise<DocWithId<CustomExerciseDoc>[]> {
    assertTenantAccess(ctx, gymId);
    const snap = await this.collection()
      .where("gymId", "==", gymId)
      .where("muscleGroup", "==", muscleGroup)
      .orderBy("name", "asc")
      .get();
    return snap.docs
      .map((d) => this.fromSnapshot(d.id, d.data()))
      .filter((d): d is DocWithId<CustomExerciseDoc> => d !== null);
  }

  async createExercise(
    ctx: FirestoreContext,
    gymId: string,
    id: string,
    input: CreateCustomExerciseInput,
  ): Promise<DocWithId<CustomExerciseDoc>> {
    const name = input.name.trim();
    return this.create(ctx, gymId, id, {
      gymId,
      name,
      nameLower: name.toLowerCase(),
      muscleGroup: input.muscleGroup,
      defaultSets: input.defaultSets ?? null,
      defaultReps: input.defaultReps ?? null,
      defaultTempo: input.defaultTempo ?? null,
      defaultRestSeconds: input.defaultRestSeconds ?? null,
      trackingType: input.trackingType ?? "WEIGHTED",
      isSeeded: input.isSeeded ?? false,
    } as WithFieldValue<CustomExerciseDoc>);
  }

  async deleteCustomExercise(
    ctx: FirestoreContext,
    gymId: string,
    id: string,
  ): Promise<boolean> {
    const doc = await this.getById(ctx, gymId, id);
    if (!doc || doc.isSeeded) return false;
    await this.delete(ctx, gymId, id);
    return true;
  }
}
