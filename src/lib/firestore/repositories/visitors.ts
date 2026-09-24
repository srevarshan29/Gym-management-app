import { Timestamp, type Firestore, type WithFieldValue } from "firebase-admin/firestore";

import { COLLECTIONS } from "@/lib/firestore/collections";
import type { FirestoreContext } from "@/lib/firestore/context";
import { assertTenantAccess } from "@/lib/firestore/context";
import type {
  DocWithId,
  PaginatedResult,
} from "@/lib/firestore/repositories/base";
import {
  TenantRepository,
  clampPageSize,
} from "@/lib/firestore/repositories/base";
import type {
  FitnessGoal,
  MemberGender,
  VisitorDoc,
  VisitorSource,
  VisitorStatus,
} from "@/lib/firestore/types";

import type { VisitorStatusFilter } from "@/lib/visitor-types";

export type { VisitorStatusFilter } from "@/lib/visitor-types";

export const VISITORS_PAGE_SIZE = 50;

export type VisitorsPageResult = {
  items: DocWithId<VisitorDoc>[];
  total: number;
  page: number;
  pageSize: number;
};

export type CreateVisitorInput = {
  name: string;
  phone: string;
  email?: string | null;
  gender?: MemberGender | null;
  visitDate: Date;
  notes?: string | null;
  status?: VisitorStatus;
  source?: VisitorSource;
  membershipPolicyAgreedText?: string | null;
  membershipPolicyAgreedAt?: Date | null;
  fitnessGoal?: FitnessGoal | null;
  ageYears?: number | null;
  heightCm?: number | null;
  weightKg?: number | null;
};

export type UpdateVisitorInput = Partial<{
  name: string;
  phone: string;
  email: string | null;
  gender: MemberGender | null;
  visitDate: Date;
  notes: string | null;
  status: VisitorStatus;
  fitnessGoal: FitnessGoal | null;
  ageYears: number | null;
  heightCm: number | null;
  weightKg: number | null;
}>;

/**
 * Firestore composite indexes required by this repository (collection: `visitors`).
 *
 * | Method / query | Filters | Order | Index fields |
 * |---|---|---|---|
 * | countByGym | gymId [+ status] [+ source] | — | prefix of any matching list index |
 * | listFiltered / listWalkInPage | gymId, source?, status? | visitDate desc | gymId+visitDate↓; +status; +source; +source+status |
 * | listQrPage / listQrRegistrations | gymId, source=qr_registration, status? | createdAt desc | gymId+source+createdAt↓; +status |
 * | findPendingQrByPhone | gymId, source=qr_registration, status=pending, phone | — | gymId+source+status+phone |
 */
export class VisitorsRepository extends TenantRepository<VisitorDoc> {
  constructor(db: Firestore) {
    super(db, COLLECTIONS.visitors);
  }

  async countByGym(
    ctx: FirestoreContext,
    gymId: string,
    filters?: {
      status?: VisitorStatus;
      source?: VisitorSource;
    },
  ): Promise<number> {
    assertTenantAccess(ctx, gymId);
    let query = this.collection().where("gymId", "==", gymId);
    if (filters?.status) {
      query = query.where("status", "==", filters.status);
    }
    if (filters?.source) {
      query = query.where("source", "==", filters.source);
    }
    const snap = await query.count().get();
    return snap.data().count;
  }

  async listFiltered(
    ctx: FirestoreContext,
    gymId: string,
    options: {
      status?: VisitorStatusFilter;
      source?: VisitorSource;
      limit?: number;
      startAfterId?: string | null;
    },
  ): Promise<PaginatedResult<VisitorDoc>> {
    assertTenantAccess(ctx, gymId);
    const limit = clampPageSize(options.limit);
    const status = options.status ?? "pending";

    let query = this.collection().where("gymId", "==", gymId);

    if (options.source) {
      query = query.where("source", "==", options.source);
    }
    if (status !== "all") {
      query = query.where("status", "==", status);
    }

    query = query.orderBy("visitDate", "desc");

    if (options.startAfterId) {
      const cursor = await this.docRef(options.startAfterId).get();
      if (cursor.exists) {
        query = query.startAfter(cursor);
      }
    }

    const snap = await query.limit(limit + 1).get();
    const docs = snap.docs
      .map((d) => this.fromSnapshot(d.id, d.data()))
      .filter((d): d is DocWithId<VisitorDoc> => d !== null);

    const hasMore = docs.length > limit;
    const items = hasMore ? docs.slice(0, limit) : docs;

    return {
      items,
      nextCursor: hasMore ? items[items.length - 1]!.id : null,
      hasMore,
    };
  }

  async listWalkInPage(
    ctx: FirestoreContext,
    gymId: string,
    options: {
      status?: VisitorStatusFilter;
      page?: number;
      pageSize?: number;
    } = {},
  ): Promise<VisitorsPageResult> {
    assertTenantAccess(ctx, gymId);
    const pageSize = clampPageSize(options.pageSize ?? VISITORS_PAGE_SIZE);
    const page = Math.max(1, Math.floor(options.page ?? 1));
    const status = options.status ?? "pending";

    const total = await this.countByGym(ctx, gymId, {
      source: "walk_in",
      ...(status !== "all" ? { status } : {}),
    });

    let query = this.collection()
      .where("gymId", "==", gymId)
      .where("source", "==", "walk_in");
    if (status !== "all") {
      query = query.where("status", "==", status);
    }
    query = query.orderBy("visitDate", "desc");

    const fetchLimit = page * pageSize;
    const snap = await query.limit(fetchLimit).get();
    const docs = snap.docs
      .map((d) => this.fromSnapshot(d.id, d.data()))
      .filter((d): d is DocWithId<VisitorDoc> => d !== null);

    const offset = (page - 1) * pageSize;
    const items = docs.slice(offset, offset + pageSize);

    return { items, total, page, pageSize };
  }

  async listQrPage(
    ctx: FirestoreContext,
    gymId: string,
    options: {
      status?: VisitorStatusFilter;
      page?: number;
      pageSize?: number;
    } = {},
  ): Promise<VisitorsPageResult> {
    assertTenantAccess(ctx, gymId);
    const pageSize = clampPageSize(options.pageSize ?? VISITORS_PAGE_SIZE);
    const page = Math.max(1, Math.floor(options.page ?? 1));
    const status = options.status ?? "pending";

    const total = await this.countByGym(ctx, gymId, {
      source: "qr_registration",
      ...(status !== "all" ? { status } : {}),
    });

    let query = this.collection()
      .where("gymId", "==", gymId)
      .where("source", "==", "qr_registration");
    if (status !== "all") {
      query = query.where("status", "==", status);
    }
    query = query.orderBy("createdAt", "desc");

    const fetchLimit = page * pageSize;
    const snap = await query.limit(fetchLimit).get();
    const docs = snap.docs
      .map((d) => this.fromSnapshot(d.id, d.data()))
      .filter((d): d is DocWithId<VisitorDoc> => d !== null);

    const offset = (page - 1) * pageSize;
    const items = docs.slice(offset, offset + pageSize);

    return { items, total, page, pageSize };
  }

  async listQrRegistrations(
    ctx: FirestoreContext,
    gymId: string,
    status: VisitorStatusFilter = "pending",
    options?: { limit?: number; startAfterId?: string | null },
  ): Promise<PaginatedResult<VisitorDoc>> {
    assertTenantAccess(ctx, gymId);
    const limit = clampPageSize(options?.limit);

    let query = this.collection()
      .where("gymId", "==", gymId)
      .where("source", "==", "qr_registration");
    if (status !== "all") {
      query = query.where("status", "==", status);
    }
    query = query.orderBy("createdAt", "desc");

    if (options?.startAfterId) {
      const cursor = await this.docRef(options.startAfterId).get();
      if (cursor.exists) {
        query = query.startAfter(cursor);
      }
    }

    const snap = await query.limit(limit + 1).get();
    const docs = snap.docs
      .map((d) => this.fromSnapshot(d.id, d.data()))
      .filter((d): d is DocWithId<VisitorDoc> => d !== null);

    const hasMore = docs.length > limit;
    const items = hasMore ? docs.slice(0, limit) : docs;

    return {
      items,
      nextCursor: hasMore ? items[items.length - 1]!.id : null,
      hasMore,
    };
  }

  async findPendingQrByPhone(
    ctx: FirestoreContext,
    gymId: string,
    phone: string,
  ): Promise<DocWithId<VisitorDoc> | null> {
    assertTenantAccess(ctx, gymId);
    const snap = await this.collection()
      .where("gymId", "==", gymId)
      .where("source", "==", "qr_registration")
      .where("status", "==", "pending")
      .where("phone", "==", phone)
      .limit(1)
      .get();
    const doc = snap.docs[0];
    if (!doc) return null;
    return this.fromSnapshot(doc.id, doc.data());
  }

  async createVisitor(
    ctx: FirestoreContext,
    gymId: string,
    id: string,
    input: CreateVisitorInput,
  ): Promise<DocWithId<VisitorDoc>> {
    const visitDate = Timestamp.fromDate(input.visitDate);
    const agreedAt = input.membershipPolicyAgreedAt
      ? Timestamp.fromDate(input.membershipPolicyAgreedAt)
      : null;

    return this.create(ctx, gymId, id, {
      gymId,
      name: input.name,
      phone: input.phone,
      email: input.email ?? null,
      gender: input.gender ?? null,
      visitDate,
      notes: input.notes ?? null,
      status: input.status ?? "pending",
      source: input.source ?? "walk_in",
      membershipPolicyAgreedText: input.membershipPolicyAgreedText ?? null,
      membershipPolicyAgreedAt: agreedAt,
      fitnessGoal: input.fitnessGoal ?? null,
      ageYears: input.ageYears ?? null,
      heightCm: input.heightCm ?? null,
      weightKg: input.weightKg ?? null,
    } as WithFieldValue<VisitorDoc>);
  }

  async updateVisitor(
    ctx: FirestoreContext,
    gymId: string,
    id: string,
    input: UpdateVisitorInput,
  ): Promise<DocWithId<VisitorDoc>> {
    const patch: Partial<VisitorDoc> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.phone !== undefined) patch.phone = input.phone;
    if (input.email !== undefined) patch.email = input.email;
    if (input.gender !== undefined) patch.gender = input.gender;
    if (input.notes !== undefined) patch.notes = input.notes;
    if (input.status !== undefined) patch.status = input.status;
    if (input.fitnessGoal !== undefined) patch.fitnessGoal = input.fitnessGoal;
    if (input.ageYears !== undefined) patch.ageYears = input.ageYears;
    if (input.heightCm !== undefined) patch.heightCm = input.heightCm;
    if (input.weightKg !== undefined) patch.weightKg = input.weightKg;
    if (input.visitDate !== undefined) {
      patch.visitDate = Timestamp.fromDate(input.visitDate);
    }
    return this.update(ctx, gymId, id, patch);
  }

  async listAllForExport(
    ctx: FirestoreContext,
    gymId: string,
    maxRows = 1000,
  ): Promise<DocWithId<VisitorDoc>[]> {
    assertTenantAccess(ctx, gymId);
    const all: DocWithId<VisitorDoc>[] = [];
    let startAfterId: string | null = null;

    while (all.length < maxRows) {
      const batch = await this.listFiltered(ctx, gymId, {
        status: "all",
        limit: clampPageSize(200),
        startAfterId,
      });
      all.push(...batch.items);
      if (!batch.nextCursor) break;
      startAfterId = batch.nextCursor;
    }

    return all.slice(0, maxRows);
  }
}
