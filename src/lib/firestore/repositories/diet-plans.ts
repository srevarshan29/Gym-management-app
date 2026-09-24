import type { Firestore, WithFieldValue } from "firebase-admin/firestore";

import { COLLECTIONS } from "@/lib/firestore/collections";
import type { FirestoreContext } from "@/lib/firestore/context";
import { assertTenantAccess } from "@/lib/firestore/context";
import type { DocWithId } from "@/lib/firestore/repositories/base";
import {
  TenantRepository,
  clampPageSize,
} from "@/lib/firestore/repositories/base";
import type { DietPlanDoc } from "@/lib/firestore/types";

export const DIET_PLANS_PAGE_SIZE = 50;

export type DietPlansPageResult = {
  items: DocWithId<DietPlanDoc>[];
  total: number;
  page: number;
  pageSize: number;
};

export type CreateDietPlanInput = {
  memberId: string;
  memberName: string;
  title: string;
  caloriesPerDay: number;
  mealPlan: string;
};

export type UpdateDietPlanInput = Partial<
  Pick<DietPlanDoc, "title" | "caloriesPerDay" | "mealPlan" | "memberName">
>;

export class DietPlansRepository extends TenantRepository<DietPlanDoc> {
  constructor(db: Firestore) {
    super(db, COLLECTIONS.dietPlans);
  }

  async countByGym(ctx: FirestoreContext, gymId: string): Promise<number> {
    assertTenantAccess(ctx, gymId);
    const snap = await this.collection()
      .where("gymId", "==", gymId)
      .count()
      .get();
    return snap.data().count;
  }

  async findByMemberId(
    ctx: FirestoreContext,
    gymId: string,
    memberId: string,
  ): Promise<DocWithId<DietPlanDoc> | null> {
    assertTenantAccess(ctx, gymId);
    const snap = await this.collection()
      .where("gymId", "==", gymId)
      .where("memberId", "==", memberId)
      .limit(1)
      .get();
    const doc = snap.docs[0];
    if (!doc) return null;
    return this.fromSnapshot(doc.id, doc.data());
  }

  async listByMemberName(
    ctx: FirestoreContext,
    gymId: string,
    options?: { limit?: number; startAfterId?: string | null },
  ) {
    assertTenantAccess(ctx, gymId);
    const limit = clampPageSize(options?.limit);
    let query = this.collection()
      .where("gymId", "==", gymId)
      .orderBy("memberName", "asc")
      .limit(limit + 1);

    if (options?.startAfterId) {
      const cursor = await this.docRef(options.startAfterId).get();
      if (cursor.exists) {
        query = query.startAfter(cursor);
      }
    }

    const snap = await query.get();
    const docs = snap.docs
      .map((d) => this.fromSnapshot(d.id, d.data()))
      .filter((d): d is DocWithId<DietPlanDoc> => d !== null);

    const hasMore = docs.length > limit;
    const items = hasMore ? docs.slice(0, limit) : docs;

    return {
      items,
      nextCursor: hasMore ? items[items.length - 1]!.id : null,
    };
  }

  async listDietPlanPage(
    ctx: FirestoreContext,
    gymId: string,
    options: { page?: number; pageSize?: number } = {},
  ): Promise<DietPlansPageResult> {
    assertTenantAccess(ctx, gymId);
    const pageSize = clampPageSize(options.pageSize ?? DIET_PLANS_PAGE_SIZE);
    const page = Math.max(1, Math.floor(options.page ?? 1));
    const total = await this.countByGym(ctx, gymId);

    const fetchLimit = page * pageSize;
    const snap = await this.collection()
      .where("gymId", "==", gymId)
      .orderBy("memberName", "asc")
      .limit(fetchLimit)
      .get();
    const docs = snap.docs
      .map((d) => this.fromSnapshot(d.id, d.data()))
      .filter((d): d is DocWithId<DietPlanDoc> => d !== null);

    const offset = (page - 1) * pageSize;
    const items = docs.slice(offset, offset + pageSize);

    return { items, total, page, pageSize };
  }

  async listAllForExport(
    ctx: FirestoreContext,
    gymId: string,
    maxRows = 1000,
  ): Promise<DocWithId<DietPlanDoc>[]> {
    const all: DocWithId<DietPlanDoc>[] = [];
    let startAfterId: string | null = null;

    while (all.length < maxRows) {
      const batch = await this.listByMemberName(ctx, gymId, {
        limit: clampPageSize(DIET_PLANS_PAGE_SIZE),
        startAfterId,
      });
      all.push(...batch.items);
      if (!batch.nextCursor) break;
      startAfterId = batch.nextCursor;
    }

    return all;
  }

  /**
   * Lightweight gym-scoped scan of assigned member ids for page eligibility checks.
   * Uses field projection and cursor pagination — does not load plan content fields.
   */
  async listAssignedMemberIds(
    ctx: FirestoreContext,
    gymId: string,
    maxRows = 1000,
  ): Promise<string[]> {
    assertTenantAccess(ctx, gymId);
    const memberIds: string[] = [];
    let startAfterId: string | null = null;

    while (memberIds.length < maxRows) {
      const limit = clampPageSize(DIET_PLANS_PAGE_SIZE);
      let query = this.collection()
        .where("gymId", "==", gymId)
        .orderBy("memberName", "asc")
        .select("gymId", "memberId", "memberName")
        .limit(limit + 1);

      if (startAfterId) {
        const cursor = await this.docRef(startAfterId).get();
        if (cursor.exists) {
          query = query.startAfter(cursor);
        }
      }

      const snap = await query.get();
      if (snap.empty) {
        break;
      }

      const docs = snap.docs.slice(0, Math.min(limit, maxRows - memberIds.length));
      for (const doc of docs) {
        const data = doc.data() as Pick<DietPlanDoc, "gymId" | "memberId">;
        if (data.gymId !== gymId) {
          continue;
        }
        const memberId = data.memberId?.trim();
        if (memberId) {
          memberIds.push(memberId);
        }
      }

      const hasMore = snap.docs.length > limit && memberIds.length < maxRows;
      if (!hasMore) {
        break;
      }

      startAfterId = docs[docs.length - 1]!.id;
    }

    return memberIds;
  }

  async createPlan(
    ctx: FirestoreContext,
    gymId: string,
    id: string,
    input: CreateDietPlanInput,
  ): Promise<DocWithId<DietPlanDoc>> {
    return this.create(ctx, gymId, id, {
      gymId,
      memberId: input.memberId,
      memberName: input.memberName,
      title: input.title,
      caloriesPerDay: input.caloriesPerDay,
      mealPlan: input.mealPlan,
    } as WithFieldValue<DietPlanDoc>);
  }

  async upsertPlan(
    ctx: FirestoreContext,
    gymId: string,
    id: string,
    input: CreateDietPlanInput,
  ): Promise<DocWithId<DietPlanDoc>> {
    const existing = await this.findByMemberId(ctx, gymId, input.memberId);
    if (existing) {
      return this.update(ctx, gymId, existing.id, {
        memberName: input.memberName,
        title: input.title,
        caloriesPerDay: input.caloriesPerDay,
        mealPlan: input.mealPlan,
      });
    }
    return this.create(ctx, gymId, id, {
      gymId,
      memberId: input.memberId,
      memberName: input.memberName,
      title: input.title,
      caloriesPerDay: input.caloriesPerDay,
      mealPlan: input.mealPlan,
    } as WithFieldValue<DietPlanDoc>);
  }
}
