import { Timestamp, type Firestore } from "firebase-admin/firestore";

import { COLLECTIONS } from "@/lib/firestore/collections";
import type { FirestoreContext } from "@/lib/firestore/context";
import { assertTenantAccess } from "@/lib/firestore/context";
import { DocumentNotFoundError } from "@/lib/firestore/errors";
import type { DocWithId } from "@/lib/firestore/repositories/base";
import { omitUndefined, serverTimestamps } from "@/lib/firestore/serialize";
import type { GymProfileDoc } from "@/lib/firestore/types";

export type UpsertGymProfileInput = {
  name: string;
  logoUrl?: string | null;
  address?: string | null;
  phone?: string | null;
  ownerNotifyPhone?: string | null;
  ownerNotifyEmail?: string | null;
  membershipPolicyText?: string | null;
};

/**
 * Gym branding and policy — doc id equals gymId (1:1 with gym).
 */
export class GymProfilesRepository {
  constructor(private readonly db: Firestore) {}

  private docRef(gymId: string) {
    return this.db.collection(COLLECTIONS.gymProfiles).doc(gymId);
  }

  async getByGymId(
    ctx: FirestoreContext,
    gymId: string,
  ): Promise<DocWithId<GymProfileDoc> | null> {
    assertTenantAccess(ctx, gymId);
    const snap = await this.docRef(gymId).get();
    if (!snap.exists) return null;
    const data = snap.data() as GymProfileDoc;
    if (data.gymId !== gymId) return null;
    return { id: snap.id, ...data };
  }

  async create(
    ctx: FirestoreContext,
    gymId: string,
    input: UpsertGymProfileInput,
  ): Promise<DocWithId<GymProfileDoc>> {
    assertTenantAccess(ctx, gymId);
    const now = Timestamp.now();
    const data = omitUndefined({
      gymId,
      name: input.name,
      logoUrl: input.logoUrl ?? null,
      address: input.address ?? null,
      phone: input.phone ?? null,
      ownerNotifyPhone: input.ownerNotifyPhone ?? null,
      ownerNotifyEmail: input.ownerNotifyEmail ?? null,
      membershipPolicyText: input.membershipPolicyText ?? null,
      ...serverTimestamps(now),
    }) satisfies GymProfileDoc;

    await this.docRef(gymId).set(data);
    const created = await this.getByGymId(ctx, gymId);
    if (!created) {
      throw new DocumentNotFoundError(COLLECTIONS.gymProfiles, gymId);
    }
    return created;
  }

  async upsert(
    ctx: FirestoreContext,
    gymId: string,
    input: UpsertGymProfileInput,
  ): Promise<DocWithId<GymProfileDoc>> {
    const existing = await this.getByGymId(ctx, gymId);
    if (!existing) {
      return this.create(ctx, gymId, input);
    }

    const payload = omitUndefined({
      ...input,
      gymId,
      updatedAt: Timestamp.now(),
    });
    await this.docRef(gymId).update(payload);
    const updated = await this.getByGymId(ctx, gymId);
    if (!updated) {
      throw new DocumentNotFoundError(COLLECTIONS.gymProfiles, gymId);
    }
    return updated;
  }
}
