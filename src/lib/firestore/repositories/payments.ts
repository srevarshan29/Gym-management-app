import {
  AggregateField,
  Timestamp,
  type Firestore,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";

import { COLLECTIONS } from "@/lib/firestore/collections";
import type { FirestoreContext } from "@/lib/firestore/context";
import { assertTenantAccess } from "@/lib/firestore/context";
import { DocumentNotFoundError } from "@/lib/firestore/errors";
import { batchGetByIds } from "@/lib/firestore/batch-get";
import { newDocId } from "@/lib/firestore/helpers";
import { queryPageByNumber } from "@/lib/firestore/pagination";
import type { DocWithId } from "@/lib/firestore/repositories/base";
import { omitUndefined } from "@/lib/firestore/serialize";
import type {
  MemberDoc,
  PaymentDoc,
  PaymentMethod,
  SubscriptionDoc,
  UserDoc,
} from "@/lib/firestore/types";

export type CreatePaymentInput = {
  memberId: string;
  subscriptionId: string | null;
  amount: number;
  method: PaymentMethod;
  paidAt: Date;
  note?: string | null;
  recordedById: string | null;
};

export type PaidPaymentRow = {
  id: string;
  paidAt: Date;
  amount: number;
  method: string;
  member: { id: string; name: string };
  subscription: { package: { name: string } } | null;
  recordedBy: { name: string } | null;
};

export class PaymentsRepository {
  constructor(private readonly db: Firestore) {}

  private col() {
    return this.db.collection(COLLECTIONS.payments);
  }

  async findById(
    ctx: FirestoreContext,
    gymId: string,
    paymentId: string,
  ): Promise<DocWithId<PaymentDoc> | null> {
    assertTenantAccess(ctx, gymId);
    const snap = await this.col().doc(paymentId).get();
    if (!snap.exists) return null;
    const data = snap.data() as PaymentDoc;
    if (data.gymId !== gymId) return null;
    return { id: snap.id, ...data };
  }

  buildPaymentData(
    gymId: string,
    input: CreatePaymentInput,
  ): { id: string; data: PaymentDoc } {
    const id = newDocId();
    const now = Timestamp.now();
    return {
      id,
      data: omitUndefined({
        gymId,
        memberId: input.memberId,
        subscriptionId: input.subscriptionId,
        amount: input.amount,
        method: input.method,
        paidAt: Timestamp.fromDate(input.paidAt),
        note: input.note ?? null,
        recordedById: input.recordedById,
        createdAt: now,
      }) satisfies PaymentDoc,
    };
  }

  async listByMember(
    ctx: FirestoreContext,
    gymId: string,
    memberId: string,
  ): Promise<DocWithId<PaymentDoc>[]> {
    assertTenantAccess(ctx, gymId);
    const snap = await this.col()
      .where("gymId", "==", gymId)
      .where("memberId", "==", memberId)
      .orderBy("paidAt", "desc")
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as PaymentDoc) }));
  }

  async listPaidPage(
    ctx: FirestoreContext,
    gymId: string,
    options: {
      page?: number;
      pageSize?: number;
      q?: string;
    },
  ): Promise<{
    rows: PaidPaymentRow[];
    matchingCount: number;
    paymentCount: number;
    totalCollected: number;
    page: number;
    pageSize: number;
  }> {
    assertTenantAccess(ctx, gymId);
    const pageSize = options.pageSize ?? 50;
    const page = Math.max(1, Math.floor(options.page ?? 1));
    const q = options.q?.trim().toLowerCase() ?? "";

    const statsQuery = this.col().where("gymId", "==", gymId);
    const listQuery = this.col()
      .where("gymId", "==", gymId)
      .orderBy("paidAt", "desc");

    const db = this.db;
    const memberCache = new Map<string, MemberDoc>();
    const subCache = new Map<string, SubscriptionDoc>();
    const userCache = new Map<string, UserDoc>();

    async function loadMember(id: string) {
      const cached = memberCache.get(id);
      if (cached) return cached;
      const s = await db.collection(COLLECTIONS.members).doc(id).get();
      if (!s.exists) throw new DocumentNotFoundError(COLLECTIONS.members, id);
      const data = s.data() as MemberDoc;
      memberCache.set(id, data);
      return data;
    }

    async function primeRelatedDocs(pageDocs: DocWithId<PaymentDoc>[]) {
      const memberIds = pageDocs.map((p) => p.memberId);
      const subIds = pageDocs
        .map((p) => p.subscriptionId)
        .filter((id): id is string => Boolean(id));
      const userIds = pageDocs
        .map((p) => p.recordedById)
        .filter((id): id is string => Boolean(id));

      const [members, subs, users] = await Promise.all([
        batchGetByIds<MemberDoc>(db, COLLECTIONS.members, memberIds),
        batchGetByIds<SubscriptionDoc>(db, COLLECTIONS.subscriptions, subIds),
        batchGetByIds<UserDoc>(db, COLLECTIONS.users, userIds),
      ]);

      for (const [id, data] of members) memberCache.set(id, data);
      for (const [id, data] of subs) subCache.set(id, data);
      for (const [id, data] of users) userCache.set(id, data);
    }

    function loadMemberCached(id: string) {
      const data = memberCache.get(id);
      if (!data) throw new DocumentNotFoundError(COLLECTIONS.members, id);
      return data;
    }

    function loadSubCached(id: string) {
      const data = subCache.get(id);
      if (!data) throw new DocumentNotFoundError(COLLECTIONS.subscriptions, id);
      return data;
    }

    function loadUserCached(id: string) {
      const data = userCache.get(id);
      if (!data) throw new DocumentNotFoundError(COLLECTIONS.users, id);
      return data;
    }

    const statsPromise = Promise.all([
      statsQuery.count().get(),
      statsQuery.aggregate({ total: AggregateField.sum("amount") }).get(),
    ]);

    let docs: DocWithId<PaymentDoc>[];
    if (q) {
      const scanPromise = (async () => {
        const scanLimit = page * pageSize;
        const filtered: DocWithId<PaymentDoc>[] = [];
        let scanned = 0;
        let cursor: QueryDocumentSnapshot | undefined;

        while (scanned < scanLimit) {
          const batchSize = Math.min(pageSize, scanLimit - scanned);
          let batchQuery = listQuery.limit(batchSize);
          if (cursor) batchQuery = batchQuery.startAfter(cursor);
          const snap = await batchQuery.get();
          if (snap.empty) break;

          for (const doc of snap.docs) {
            scanned += 1;
            const payment = { id: doc.id, ...(doc.data() as PaymentDoc) };
            const member = await loadMember(payment.memberId);
            if (member.name.toLowerCase().includes(q)) {
              filtered.push(payment);
            }
          }

          cursor = snap.docs[snap.docs.length - 1];
          if (snap.docs.length < batchSize) break;
        }

        return filtered;
      })();

      const [filtered] = await Promise.all([scanPromise, statsPromise]);
      docs = filtered;
    } else {
      const [pageSnaps] = await Promise.all([
        queryPageByNumber(listQuery, page, pageSize),
        statsPromise,
      ]);
      docs = pageSnaps.map((d) => ({
        id: d.id,
        ...(d.data() as PaymentDoc),
      }));
    }

    const [countSnap, sumSnap] = await statsPromise;
    const paymentCount = countSnap.data().count;
    const totalCollected = sumSnap.data().total ?? 0;

    const matchingCount = q ? docs.length : paymentCount;
    const offset = (page - 1) * pageSize;
    const pageDocs = q ? docs.slice(offset, offset + pageSize) : docs;

    await primeRelatedDocs(pageDocs);

    const rows: PaidPaymentRow[] = pageDocs.map((p) => {
      const member = loadMemberCached(p.memberId);
      let subscription: PaidPaymentRow["subscription"] = null;
      if (p.subscriptionId) {
        const sub = loadSubCached(p.subscriptionId);
        subscription = { package: { name: sub.packageName } };
      }
      let recordedBy: PaidPaymentRow["recordedBy"] = null;
      if (p.recordedById) {
        const user = loadUserCached(p.recordedById);
        recordedBy = { name: user.name };
      }
      return {
        id: p.id,
        paidAt: p.paidAt.toDate(),
        amount: p.amount,
        method: p.method,
        member: { id: p.memberId, name: member.name },
        subscription,
        recordedBy,
      };
    });

    return {
      rows,
      matchingCount,
      paymentCount,
      totalCollected,
      page,
      pageSize,
    };
  }

  async countByGym(ctx: FirestoreContext, gymId: string): Promise<number> {
    const snap = await this.col().where("gymId", "==", gymId).count().get();
    return snap.data().count;
  }

  async countPaidInRange(
    ctx: FirestoreContext,
    gymId: string,
    start: Date,
    end: Date,
  ): Promise<number> {
    assertTenantAccess(ctx, gymId);
    const snap = await this.col()
      .where("gymId", "==", gymId)
      .where("paidAt", ">=", Timestamp.fromDate(start))
      .where("paidAt", "<", Timestamp.fromDate(end))
      .count()
      .get();
    return snap.data().count;
  }

  async listExportBatch(
    ctx: FirestoreContext,
    gymId: string,
    options: {
      limit: number;
      startAfterId?: string | null;
    },
  ): Promise<{ rows: DocWithId<PaymentDoc>[]; nextCursor: string | null }> {
    assertTenantAccess(ctx, gymId);
    let query = this.col()
      .where("gymId", "==", gymId)
      .orderBy("paidAt", "desc");

    if (options.startAfterId) {
      const cursor = await this.col().doc(options.startAfterId).get();
      if (cursor.exists) {
        query = query.startAfter(cursor);
      }
    }

    const snap = await query.limit(options.limit + 1).get();
    const docs = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as PaymentDoc),
    }));
    const hasMore = docs.length > options.limit;
    const rows = hasMore ? docs.slice(0, options.limit) : docs;
    return {
      rows,
      nextCursor: hasMore ? rows[rows.length - 1]!.id : null,
    };
  }

  async mapExportRows(
    rows: DocWithId<PaymentDoc>[],
  ): Promise<PaidPaymentRow[]> {
    const db = this.db;
    const memberCache = new Map<string, MemberDoc>();
    const subCache = new Map<string, SubscriptionDoc>();
    const userCache = new Map<string, UserDoc>();

    async function loadMember(id: string) {
      if (memberCache.has(id)) return memberCache.get(id)!;
      const s = await db.collection(COLLECTIONS.members).doc(id).get();
      if (!s.exists) throw new DocumentNotFoundError(COLLECTIONS.members, id);
      const data = s.data() as MemberDoc;
      memberCache.set(id, data);
      return data;
    }

    async function loadSub(id: string) {
      if (subCache.has(id)) return subCache.get(id)!;
      const s = await db.collection(COLLECTIONS.subscriptions).doc(id).get();
      if (!s.exists) throw new DocumentNotFoundError(COLLECTIONS.subscriptions, id);
      const data = s.data() as SubscriptionDoc;
      subCache.set(id, data);
      return data;
    }

    async function loadUser(id: string) {
      if (userCache.has(id)) return userCache.get(id)!;
      const s = await db.collection(COLLECTIONS.users).doc(id).get();
      if (!s.exists) throw new DocumentNotFoundError(COLLECTIONS.users, id);
      const data = s.data() as UserDoc;
      userCache.set(id, data);
      return data;
    }

    return Promise.all(
      rows.map(async (p) => {
        const member = await loadMember(p.memberId);
        let subscription: PaidPaymentRow["subscription"] = null;
        if (p.subscriptionId) {
          const sub = await loadSub(p.subscriptionId);
          subscription = { package: { name: sub.packageName } };
        }
        let recordedBy: PaidPaymentRow["recordedBy"] = null;
        if (p.recordedById) {
          const user = await loadUser(p.recordedById);
          recordedBy = { name: user.name };
        }
        return {
          id: p.id,
          paidAt: p.paidAt.toDate(),
          amount: p.amount,
          method: p.method,
          member: { id: p.memberId, name: member.name },
          subscription,
          recordedBy,
        };
      }),
    );
  }

  async sumPaidInRange(
    ctx: FirestoreContext,
    gymId: string,
    start: Date,
    end: Date,
  ): Promise<number> {
    assertTenantAccess(ctx, gymId);
    const snap = await this.col()
      .where("gymId", "==", gymId)
      .where("paidAt", ">=", Timestamp.fromDate(start))
      .where("paidAt", "<", Timestamp.fromDate(end))
      .aggregate({ total: AggregateField.sum("amount") })
      .get();
    return snap.data().total ?? 0;
  }

  /** All-time sum of logged member payments for a gym (realized income only). */
  async sumAllPaidByGym(ctx: FirestoreContext, gymId: string): Promise<number> {
    assertTenantAccess(ctx, gymId);
    const snap = await this.col()
      .where("gymId", "==", gymId)
      .aggregate({ total: AggregateField.sum("amount") })
      .get();
    return snap.data().total ?? 0;
  }

  async listSince(
    ctx: FirestoreContext,
    gymId: string,
    since: Date,
  ): Promise<DocWithId<PaymentDoc>[]> {
    assertTenantAccess(ctx, gymId);
    const snap = await this.col()
      .where("gymId", "==", gymId)
      .where("paidAt", ">=", Timestamp.fromDate(since))
      .orderBy("paidAt", "desc")
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as PaymentDoc) }));
  }
}
