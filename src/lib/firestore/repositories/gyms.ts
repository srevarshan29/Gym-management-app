import { FieldValue, Timestamp, type Firestore } from "firebase-admin/firestore";

import { COLLECTIONS } from "@/lib/firestore/collections";
import type { FirestoreContext } from "@/lib/firestore/context";
import { DocumentNotFoundError } from "@/lib/firestore/errors";
import type { DocWithId } from "@/lib/firestore/repositories/base";
import { omitUndefined, serverTimestamps } from "@/lib/firestore/serialize";
import type { GymDashboardCounters, GymDoc } from "@/lib/firestore/types";

export type CreateGymInput = {
  id: string;
  name: string;
  slug?: string | null;
  registrationToken: string;
};

const EMPTY_DASHBOARD_COUNTERS = (): GymDashboardCounters => ({
  activeMembers: 0,
  expiredMembers: 0,
  expiringSoonMembers: 0,
  pendingPaymentsCount: 0,
  pendingPaymentsAmount: 0,
  revenueThisMonth: 0,
  newMembersThisMonth: 0,
  pendingWalkInVisitors: 0,
  employeeCount: 0,
  eventCount: 0,
  dietPlanCount: 0,
  workoutPlanCount: 0,
  ptMemberCount: 0,
  countersUpdatedAt: Timestamp.now(),
});

/**
 * Gyms repository — root tenant document with atomic counters and
 * precomputed dashboard metrics (plan.md §5).
 */
export class GymsRepository {
  constructor(private readonly db: Firestore) {}

  private col() {
    return this.db.collection(COLLECTIONS.gyms);
  }

  async getById(
    _ctx: FirestoreContext,
    gymId: string,
  ): Promise<DocWithId<GymDoc> | null> {
    const snap = await this.col().doc(gymId).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...(snap.data() as GymDoc) };
  }

  async findByRegistrationToken(
    _ctx: FirestoreContext,
    token: string,
  ): Promise<Pick<DocWithId<GymDoc>, "id" | "name" | "registrationToken"> | null> {
    const snap = await this.col()
      .where("registrationToken", "==", token)
      .limit(1)
      .get();
    const doc = snap.docs[0];
    if (!doc) return null;
    const data = doc.data() as GymDoc;
    return {
      id: doc.id,
      name: data.name,
      registrationToken: data.registrationToken,
    };
  }

  async getRegistrationToken(
    _ctx: FirestoreContext,
    gymId: string,
  ): Promise<string | null> {
    const gym = await this.getById(_ctx, gymId);
    return gym?.registrationToken ?? null;
  }

  /** Platform admin dashboard — newest gyms first, capped to avoid bulk load. */
  async listAllForAdmin(
    _ctx: FirestoreContext,
    limit = 100,
  ): Promise<DocWithId<GymDoc>[]> {
    const snap = await this.col()
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as GymDoc) }));
  }

  async create(
    ctx: FirestoreContext,
    input: CreateGymInput,
  ): Promise<DocWithId<GymDoc>> {
    if (ctx.kind !== "super_admin" && ctx.kind !== "platform") {
      throw new Error("Only super-admin or platform context may create gyms.");
    }

    const now = Timestamp.now();
    const data = omitUndefined({
      name: input.name,
      slug: input.slug ?? null,
      registrationToken: input.registrationToken,
      memberSeq: 0,
      receiptSeq: 0,
      dashboardCounters: EMPTY_DASHBOARD_COUNTERS(),
      ...serverTimestamps(now),
    }) satisfies Omit<GymDoc, "dashboardCounters"> & {
      dashboardCounters: GymDashboardCounters;
    };

    await this.col().doc(input.id).set(data);
    const created = await this.getById(ctx, input.id);
    if (!created) throw new DocumentNotFoundError(COLLECTIONS.gyms, input.id);
    return created;
  }

  /** Atomic member number — Firestore transaction equivalent of Postgres UPDATE RETURNING. */
  async nextMemberNumber(gymId: string): Promise<number> {
    return this.db.runTransaction(async (tx) => {
      const ref = this.col().doc(gymId);
      const snap = await tx.get(ref);
      if (!snap.exists) throw new DocumentNotFoundError(COLLECTIONS.gyms, gymId);
      const current = (snap.data() as GymDoc).memberSeq;
      const next = current + 1;
      tx.update(ref, { memberSeq: next, updatedAt: Timestamp.now() });
      return next;
    });
  }

  /** Atomic receipt number. */
  async nextReceiptNumber(gymId: string): Promise<number> {
    return this.db.runTransaction(async (tx) => {
      const ref = this.col().doc(gymId);
      const snap = await tx.get(ref);
      if (!snap.exists) throw new DocumentNotFoundError(COLLECTIONS.gyms, gymId);
      const current = (snap.data() as GymDoc).receiptSeq;
      const next = current + 1;
      tx.update(ref, { receiptSeq: next, updatedAt: Timestamp.now() });
      return next;
    });
  }

  /** Merge partial counter updates (called after member/payment writes). */
  async patchDashboardCounters(
    gymId: string,
    patch: Partial<Omit<GymDashboardCounters, "countersUpdatedAt">>,
  ): Promise<void> {
    const sanitized = omitUndefined(patch);
    await this.col().doc(gymId).update({
      dashboardCounters: {
        ...sanitized,
        countersUpdatedAt: Timestamp.now(),
      },
      updatedAt: Timestamp.now(),
    });
  }

  /** Increment a single numeric counter field atomically. */
  async incrementDashboardCounter(
    gymId: string,
    field: keyof Omit<GymDashboardCounters, "countersUpdatedAt">,
    delta: number,
  ): Promise<void> {
    await this.col()
      .doc(gymId)
      .update({
        [`dashboardCounters.${field}`]: FieldValue.increment(delta),
        "dashboardCounters.countersUpdatedAt": Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
  }
}
