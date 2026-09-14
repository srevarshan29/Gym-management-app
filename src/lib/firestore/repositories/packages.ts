import { Timestamp, type Firestore } from "firebase-admin/firestore";

import { COLLECTIONS } from "@/lib/firestore/collections";
import type { FirestoreContext } from "@/lib/firestore/context";
import { assertTenantAccess } from "@/lib/firestore/context";
import { DocumentNotFoundError } from "@/lib/firestore/errors";
import { newDocId } from "@/lib/firestore/helpers";
import type { DocWithId } from "@/lib/firestore/repositories/base";
import { omitUndefined, serverTimestamps } from "@/lib/firestore/serialize";
import type { DurationUnit, PackageDoc } from "@/lib/firestore/types";

export type CreatePackageInput = {
  name: string;
  price: number;
  durationValue: number;
  durationUnit: DurationUnit;
  isActive?: boolean;
};

export class PackagesRepository {
  constructor(private readonly db: Firestore) {}

  private col() {
    return this.db.collection(COLLECTIONS.packages);
  }

  async findById(
    ctx: FirestoreContext,
    gymId: string,
    packageId: string,
  ): Promise<DocWithId<PackageDoc> | null> {
    assertTenantAccess(ctx, gymId);
    const snap = await this.col().doc(packageId).get();
    if (!snap.exists) return null;
    const data = snap.data() as PackageDoc;
    if (data.gymId !== gymId) return null;
    return { id: snap.id, ...data };
  }

  async create(
    ctx: FirestoreContext,
    gymId: string,
    input: CreatePackageInput,
  ): Promise<DocWithId<PackageDoc>> {
    assertTenantAccess(ctx, gymId);
    const id = newDocId();
    const now = Timestamp.now();
    const data = omitUndefined({
      gymId,
      name: input.name,
      price: input.price,
      durationValue: input.durationValue,
      durationUnit: input.durationUnit,
      isActive: input.isActive ?? true,
      ...serverTimestamps(now),
    }) satisfies PackageDoc;
    await this.col().doc(id).set(data);
    const created = await this.findById(ctx, gymId, id);
    if (!created) throw new DocumentNotFoundError(COLLECTIONS.packages, id);
    return created;
  }

  async update(
    ctx: FirestoreContext,
    gymId: string,
    packageId: string,
    input: Partial<CreatePackageInput>,
  ): Promise<boolean> {
    const existing = await this.findById(ctx, gymId, packageId);
    if (!existing) return false;
    await this.col()
      .doc(packageId)
      .update(omitUndefined({ ...input, updatedAt: Timestamp.now() }));
    return true;
  }

  async setActive(
    ctx: FirestoreContext,
    gymId: string,
    packageId: string,
    isActive: boolean,
  ): Promise<boolean> {
    return this.update(ctx, gymId, packageId, { isActive });
  }

  async listByGym(
    ctx: FirestoreContext,
    gymId: string,
  ): Promise<DocWithId<PackageDoc>[]> {
    assertTenantAccess(ctx, gymId);
    const snap = await this.col()
      .where("gymId", "==", gymId)
      .orderBy("isActive", "desc")
      .orderBy("createdAt", "asc")
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as PackageDoc) }));
  }

  async listActive(
    ctx: FirestoreContext,
    gymId: string,
  ): Promise<DocWithId<PackageDoc>[]> {
    assertTenantAccess(ctx, gymId);
    const snap = await this.col()
      .where("gymId", "==", gymId)
      .where("isActive", "==", true)
      .orderBy("createdAt", "asc")
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as PackageDoc) }));
  }

  async countSubscriptions(
    ctx: FirestoreContext,
    gymId: string,
    packageId: string,
  ): Promise<number> {
    const snap = await this.db
      .collection(COLLECTIONS.subscriptions)
      .where("gymId", "==", gymId)
      .where("packageId", "==", packageId)
      .count()
      .get();
    return snap.data().count;
  }
}
