import { Timestamp, type Firestore } from "firebase-admin/firestore";

import { COLLECTIONS } from "@/lib/firestore/collections";
import type { FirestoreContext } from "@/lib/firestore/context";
import { assertTenantAccess } from "@/lib/firestore/context";
import { DocumentNotFoundError } from "@/lib/firestore/errors";
import { newDocId } from "@/lib/firestore/helpers";
import {
  adjustMemberPendingTotal,
  computeSubscriptionPendingFields,
} from "@/lib/firestore/pending-sync";
import type { DocWithId } from "@/lib/firestore/repositories/base";
import { omitUndefined } from "@/lib/firestore/serialize";
import type { MemberDoc, SubscriptionDoc } from "@/lib/firestore/types";
import { computeSubscriptionBalance } from "@/lib/subscription-balance";

export type CreateSubscriptionInput = {
  memberId: string;
  packageId: string;
  packageName: string;
  memberName: string;
  memberNumber: number;
  startDate: Date;
  endDate: Date;
  priceAtPurchase: number;
  createdById: string | null;
  initialPaidTotal?: number;
};

export class SubscriptionsRepository {
  constructor(private readonly db: Firestore) {}

  private col() {
    return this.db.collection(COLLECTIONS.subscriptions);
  }

  async findById(
    ctx: FirestoreContext,
    gymId: string,
    subscriptionId: string,
  ): Promise<DocWithId<SubscriptionDoc> | null> {
    assertTenantAccess(ctx, gymId);
    const snap = await this.col().doc(subscriptionId).get();
    if (!snap.exists) return null;
    const data = snap.data() as SubscriptionDoc;
    if (data.gymId !== gymId) return null;
    return { id: snap.id, ...data };
  }

  /** Batch-load subscriptions by id (used by dashboard collection totals). */
  async findManyByIds(
    ctx: FirestoreContext,
    gymId: string,
    subscriptionIds: string[],
  ): Promise<Map<string, DocWithId<SubscriptionDoc>>> {
    assertTenantAccess(ctx, gymId);
    const unique = [...new Set(subscriptionIds)];
    const map = new Map<string, DocWithId<SubscriptionDoc>>();
    if (unique.length === 0) return map;

    const CHUNK_SIZE = 100;
    for (let i = 0; i < unique.length; i += CHUNK_SIZE) {
      const chunk = unique.slice(i, i + CHUNK_SIZE);
      const refs = chunk.map((id) => this.col().doc(id));
      const snaps = await this.db.getAll(...refs);
      for (const snap of snaps) {
        if (!snap.exists) continue;
        const data = snap.data() as SubscriptionDoc;
        if (data.gymId !== gymId) continue;
        map.set(snap.id, { id: snap.id, ...data });
      }
    }
    return map;
  }

  buildSubscriptionData(
    gymId: string,
    input: CreateSubscriptionInput,
  ): Omit<SubscriptionDoc, never> & { id: string } {
    const id = newDocId();
    const paidTotal = input.initialPaidTotal ?? 0;
    const { pendingAmount } = computeSubscriptionPendingFields(
      input.priceAtPurchase,
      paidTotal,
      0,
    );
    return {
      id,
      gymId,
      memberId: input.memberId,
      packageId: input.packageId,
      packageName: input.packageName,
      memberName: input.memberName,
      memberNumber: input.memberNumber,
      startDate: Timestamp.fromDate(input.startDate),
      endDate: Timestamp.fromDate(input.endDate),
      priceAtPurchase: input.priceAtPurchase,
      paidTotal,
      pendingAmount,
      writtenOffAmount: 0,
      writtenOffAt: null,
      writtenOffById: null,
      createdById: input.createdById,
      createdAt: Timestamp.now(),
    };
  }

  memberCurrentSubscriptionPatch(
    member: Pick<
      MemberDoc,
      "currentEndDate" | "addedByName"
    >,
    sub: Pick<
      SubscriptionDoc,
      "startDate" | "endDate"
    > & { id: string; packageName: string },
    addedByName: string | null,
  ): Partial<MemberDoc> {
    const subEnd = sub.endDate.toMillis();
    const currentEnd = member.currentEndDate?.toMillis() ?? 0;
    if (subEnd >= currentEnd) {
      return {
        currentSubscriptionId: sub.id,
        currentStartDate: sub.startDate,
        currentEndDate: sub.endDate,
        currentPackageName: sub.packageName,
        ...(member.addedByName == null && addedByName
          ? { addedByName }
          : {}),
      };
    }
    return {};
  }

  async findLatestByMember(
    ctx: FirestoreContext,
    gymId: string,
    memberId: string,
  ): Promise<DocWithId<SubscriptionDoc> | null> {
    assertTenantAccess(ctx, gymId);
    const snap = await this.col()
      .where("gymId", "==", gymId)
      .where("memberId", "==", memberId)
      .orderBy("endDate", "desc")
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();
    const doc = snap.docs[0];
    if (!doc) return null;
    return { id: doc.id, ...(doc.data() as SubscriptionDoc) };
  }

  async listByMember(
    ctx: FirestoreContext,
    gymId: string,
    memberId: string,
  ): Promise<DocWithId<SubscriptionDoc>[]> {
    assertTenantAccess(ctx, gymId);
    const snap = await this.col()
      .where("gymId", "==", gymId)
      .where("memberId", "==", memberId)
      .orderBy("startDate", "desc")
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as SubscriptionDoc) }));
  }

  async applyPaymentToSubscription(
    ctx: FirestoreContext,
    gymId: string,
    subscriptionId: string,
    paymentAmount: number,
    memberId: string,
  ): Promise<{ subDelta: number; memberId: string } | null> {
    const sub = await this.findById(ctx, gymId, subscriptionId);
    if (!sub) return null;
    const oldPending = sub.pendingAmount;
    const paidTotal = sub.paidTotal + paymentAmount;
    const fields = computeSubscriptionPendingFields(
      sub.priceAtPurchase,
      paidTotal,
      sub.writtenOffAmount,
    );
    await this.col().doc(subscriptionId).update(
      omitUndefined({
        paidTotal: fields.paidTotal,
        pendingAmount: fields.pendingAmount,
      }),
    );
    return { subDelta: fields.pendingAmount - oldPending, memberId };
  }

  async writeOffDues(
    ctx: FirestoreContext,
    gymId: string,
    subscriptionId: string,
    writtenOffById: string,
  ): Promise<
    | { ok: true; memberId: string; pendingDelta: number }
    | { ok: false; error: string }
  > {
    const sub = await this.findById(ctx, gymId, subscriptionId);
    if (!sub) return { ok: false, error: "Subscription not found." };

    const balance = computeSubscriptionBalance(
      sub.priceAtPurchase,
      sub.paidTotal,
      sub.writtenOffAmount,
    );
    if (balance.pendingAmount <= 0) {
      return { ok: false, error: "This subscription has no outstanding balance." };
    }

    const nextWrittenOff = balance.writtenOffAmount + balance.pendingAmount;
    await this.col().doc(subscriptionId).update({
      writtenOffAmount: nextWrittenOff,
      pendingAmount: 0,
      writtenOffAt: Timestamp.now(),
      writtenOffById,
    });
    return {
      ok: true,
      memberId: sub.memberId,
      pendingDelta: -balance.pendingAmount,
    };
  }

  async listPendingCyclesPage(
    ctx: FirestoreContext,
    gymId: string,
    options: {
      page?: number;
      pageSize?: number;
      q?: string;
    },
  ): Promise<{
    rows: DocWithId<SubscriptionDoc>[];
    matchingCount: number;
    unpaidCycleCount: number;
    totalDue: number;
    page: number;
    pageSize: number;
  }> {
    assertTenantAccess(ctx, gymId);
    const pageSize = options.pageSize ?? 50;
    const page = Math.max(1, Math.floor(options.page ?? 1));
    const q = options.q?.trim().toLowerCase() ?? "";

    const snap = await this.col()
      .where("gymId", "==", gymId)
      .where("pendingAmount", ">", 0)
      .orderBy("pendingAmount", "desc")
      .get();

    let rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as SubscriptionDoc) }));
    const unpaidCycleCount = rows.length;
    const totalDue = rows.reduce((sum, r) => sum + r.pendingAmount, 0);

    if (q) {
      rows = rows.filter((r) => r.memberName.toLowerCase().includes(q));
    }

    const matchingCount = rows.length;
    const offset = (page - 1) * pageSize;
    const pageRows = rows.slice(offset, offset + pageSize);

    return {
      rows: pageRows,
      matchingCount,
      unpaidCycleCount,
      totalDue,
      page,
      pageSize,
    };
  }

  async sumPendingTotals(
    ctx: FirestoreContext,
    gymId: string,
  ): Promise<{ pendingTotal: number; pendingMemberCount: number }> {
    assertTenantAccess(ctx, gymId);
    const snap = await this.col()
      .where("gymId", "==", gymId)
      .where("pendingAmount", ">", 0)
      .get();
    const memberIds = new Set<string>();
    let pendingTotal = 0;
    for (const doc of snap.docs) {
      const data = doc.data() as SubscriptionDoc;
      pendingTotal += data.pendingAmount;
      memberIds.add(data.memberId);
    }
    return { pendingTotal, pendingMemberCount: memberIds.size };
  }

  /**
   * Earliest subscription startDate per member, filtered to members whose
   * first join falls on or after `since` (matches Prisma groupBy analytics).
   */
  async listEarliestJoinStartsSince(
    ctx: FirestoreContext,
    gymId: string,
    since: Date,
  ): Promise<Date[]> {
    assertTenantAccess(ctx, gymId);
    const snap = await this.col().where("gymId", "==", gymId).get();
    const earliestByMember = new Map<string, Date>();

    for (const doc of snap.docs) {
      const data = doc.data() as SubscriptionDoc;
      const start = data.startDate.toDate();
      const existing = earliestByMember.get(data.memberId);
      if (!existing || start < existing) {
        earliestByMember.set(data.memberId, start);
      }
    }

    return [...earliestByMember.values()].filter((start) => start >= since);
  }
}
