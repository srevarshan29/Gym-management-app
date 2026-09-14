import { Timestamp, type Firestore, type Transaction } from "firebase-admin/firestore";

import { COLLECTIONS } from "@/lib/firestore/collections";
import type { FirestoreContext } from "@/lib/firestore/context";
import { assertTenantAccess } from "@/lib/firestore/context";
import { DocumentNotFoundError } from "@/lib/firestore/errors";
import type { DocWithId } from "@/lib/firestore/repositories/base";
import {
  TenantRepository,
  clampPageSize,
} from "@/lib/firestore/repositories/base";
import { omitUndefined, serverTimestamps } from "@/lib/firestore/serialize";
import type {
  WorkoutLevel,
  WorkoutPlanDayEmbedded,
  WorkoutPlanDoc,
} from "@/lib/firestore/types";

export const WORKOUT_PLANS_PAGE_SIZE = 50;

export type WorkoutPlansPageResult = {
  items: DocWithId<WorkoutPlanDoc>[];
  total: number;
  page: number;
  pageSize: number;
};

export type UpsertWorkoutPlanInput = {
  memberId: string;
  memberName: string;
  title: string;
  durationWeeks?: number | null;
  focusGoal?: string | null;
  level?: WorkoutLevel | null;
  weeklySchedule?: string | null;
  days: WorkoutPlanDayEmbedded[];
};

export class WorkoutPlansRepository extends TenantRepository<WorkoutPlanDoc> {
  constructor(db: Firestore) {
    super(db, COLLECTIONS.workoutPlans);
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
  ): Promise<DocWithId<WorkoutPlanDoc> | null> {
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
      .filter((d): d is DocWithId<WorkoutPlanDoc> => d !== null);

    const hasMore = docs.length > limit;
    const items = hasMore ? docs.slice(0, limit) : docs;

    return {
      items,
      nextCursor: hasMore ? items[items.length - 1]!.id : null,
    };
  }

  async listWorkoutPlanPage(
    ctx: FirestoreContext,
    gymId: string,
    options: { page?: number; pageSize?: number } = {},
  ): Promise<WorkoutPlansPageResult> {
    assertTenantAccess(ctx, gymId);
    const pageSize = clampPageSize(options.pageSize ?? WORKOUT_PLANS_PAGE_SIZE);
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
      .filter((d): d is DocWithId<WorkoutPlanDoc> => d !== null);

    const offset = (page - 1) * pageSize;
    const items = docs.slice(offset, offset + pageSize);

    return { items, total, page, pageSize };
  }

  async listAllForExport(
    ctx: FirestoreContext,
    gymId: string,
    maxRows = 1000,
  ): Promise<DocWithId<WorkoutPlanDoc>[]> {
    const all: DocWithId<WorkoutPlanDoc>[] = [];
    let startAfterId: string | null = null;

    while (all.length < maxRows) {
      const batch = await this.listByMemberName(ctx, gymId, {
        limit: clampPageSize(WORKOUT_PLANS_PAGE_SIZE),
        startAfterId,
      });
      all.push(...batch.items);
      if (!batch.nextCursor) break;
      startAfterId = batch.nextCursor;
    }

    return all;
  }

  /** Replace entire embedded plan in one write (Step 5 action layer). */
  async savePlan(
    ctx: FirestoreContext,
    gymId: string,
    planId: string,
    input: UpsertWorkoutPlanInput,
  ): Promise<DocWithId<WorkoutPlanDoc>> {
    assertTenantAccess(ctx, gymId);
    const now = Timestamp.now();
    const existing = await this.findByMemberId(ctx, gymId, input.memberId);
    const idToUse = existing?.id ?? planId;

    const payload = omitUndefined({
      gymId,
      memberId: input.memberId,
      memberName: input.memberName,
      title: input.title,
      durationWeeks: input.durationWeeks ?? null,
      focusGoal: input.focusGoal ?? null,
      level: input.level ?? null,
      weeklySchedule: input.weeklySchedule ?? null,
      days: input.days,
      updatedAt: now,
    });

    if (existing) {
      await this.docRef(idToUse).update(payload);
    } else {
      await this.docRef(idToUse).set({
        ...payload,
        ...serverTimestamps(now),
      });
    }

    const saved = await this.getById(ctx, gymId, idToUse);
    if (!saved) {
      throw new DocumentNotFoundError(COLLECTIONS.workoutPlans, idToUse);
    }
    return saved;
  }

  async savePlanInTransaction(
    tx: Transaction,
    ctx: FirestoreContext,
    gymId: string,
    planId: string,
    input: UpsertWorkoutPlanInput,
    existing: DocWithId<WorkoutPlanDoc> | null,
  ): Promise<string> {
    assertTenantAccess(ctx, gymId);
    const now = Timestamp.now();
    const idToUse = existing?.id ?? planId;
    const ref = this.docRef(idToUse);

    const payload = omitUndefined({
      gymId,
      memberId: input.memberId,
      memberName: input.memberName,
      title: input.title,
      durationWeeks: input.durationWeeks ?? null,
      focusGoal: input.focusGoal ?? null,
      level: input.level ?? null,
      weeklySchedule: input.weeklySchedule ?? null,
      days: input.days,
      updatedAt: now,
    });

    if (existing) {
      tx.update(ref, payload);
    } else {
      tx.set(ref, {
        ...payload,
        ...serverTimestamps(now),
      });
    }

    return idToUse;
  }

  /** True when any embedded plan day references this library exercise id. */
  async isExerciseReferenced(
    ctx: FirestoreContext,
    gymId: string,
    exerciseId: string,
  ): Promise<boolean> {
    assertTenantAccess(ctx, gymId);
    const snap = await this.collection().where("gymId", "==", gymId).get();
    for (const doc of snap.docs) {
      const plan = doc.data() as WorkoutPlanDoc;
      for (const day of plan.days ?? []) {
        if (
          day.exercises.some(
            (row) => row.exerciseId != null && row.exerciseId === exerciseId,
          )
        ) {
          return true;
        }
      }
    }
    return false;
  }
}
