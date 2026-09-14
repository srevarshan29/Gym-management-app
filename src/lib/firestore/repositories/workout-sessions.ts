import {
  Timestamp,
  type Firestore,
  type Transaction,
} from "firebase-admin/firestore";

import { COLLECTIONS } from "@/lib/firestore/collections";
import type { FirestoreContext } from "@/lib/firestore/context";
import { assertMemberSelfAccess, assertTenantAccess } from "@/lib/firestore/context";
import { DocumentNotFoundError } from "@/lib/firestore/errors";
import type { DocWithId } from "@/lib/firestore/repositories/base";
import { TenantRepository } from "@/lib/firestore/repositories/base";
import { omitUndefined, serverTimestamps } from "@/lib/firestore/serialize";
import type {
  WorkoutSessionDoc,
  WorkoutSessionExerciseEmbedded,
  WorkoutSessionStatus,
  WorkoutSetLogEmbedded,
} from "@/lib/firestore/types";

export type CreateWorkoutSessionInput = {
  memberId: string;
  workoutPlanId: string;
  workoutPlanDayId: string | null;
  exercises: WorkoutSessionExerciseEmbedded[];
};

export class WorkoutSessionsRepository extends TenantRepository<WorkoutSessionDoc> {
  constructor(db: Firestore) {
    super(db, COLLECTIONS.workoutSessions);
  }

  async findActiveSession(
    ctx: FirestoreContext,
    gymId: string,
    memberId: string,
  ): Promise<DocWithId<WorkoutSessionDoc> | null> {
    assertTenantAccess(ctx, gymId);
    assertMemberSelfAccess(ctx, memberId);
    const snap = await this.collection()
      .where("gymId", "==", gymId)
      .where("memberId", "==", memberId)
      .where("status", "==", "IN_PROGRESS")
      .orderBy("startedAt", "desc")
      .limit(1)
      .get();
    const doc = snap.docs[0];
    if (!doc) return null;
    return this.fromSnapshot(doc.id, doc.data());
  }

  async deleteByWorkoutPlanId(
    ctx: FirestoreContext,
    gymId: string,
    workoutPlanId: string,
  ): Promise<number> {
    assertTenantAccess(ctx, gymId);
    const snap = await this.collection()
      .where("gymId", "==", gymId)
      .where("workoutPlanId", "==", workoutPlanId)
      .get();

    if (snap.empty) return 0;

    let deleted = 0;
    for (let i = 0; i < snap.docs.length; i += 500) {
      const batch = this.db.batch();
      const chunk = snap.docs.slice(i, i + 500);
      for (const doc of chunk) {
        batch.delete(doc.ref);
      }
      await batch.commit();
      deleted += chunk.length;
    }

    return deleted;
  }

  async findLastCompletedSession(
    ctx: FirestoreContext,
    gymId: string,
    memberId: string,
  ): Promise<DocWithId<WorkoutSessionDoc> | null> {
    assertTenantAccess(ctx, gymId);
    assertMemberSelfAccess(ctx, memberId);
    const snap = await this.collection()
      .where("gymId", "==", gymId)
      .where("memberId", "==", memberId)
      .where("status", "==", "COMPLETED")
      .orderBy("completedAt", "desc")
      .limit(1)
      .get();
    const doc = snap.docs[0];
    if (!doc) return null;
    return this.fromSnapshot(doc.id, doc.data());
  }

  async getActiveSessionForMember(
    ctx: FirestoreContext,
    gymId: string,
    memberId: string,
    sessionId: string,
  ): Promise<DocWithId<WorkoutSessionDoc> | null> {
    assertTenantAccess(ctx, gymId);
    assertMemberSelfAccess(ctx, memberId);
    const session = await this.getById(ctx, gymId, sessionId);
    if (!session) return null;
    if (session.memberId !== memberId || session.status !== "IN_PROGRESS") {
      return null;
    }
    return session;
  }

  async listCompletedForMember(
    ctx: FirestoreContext,
    gymId: string,
    memberId: string,
    limit = 200,
  ): Promise<DocWithId<WorkoutSessionDoc>[]> {
    assertTenantAccess(ctx, gymId);
    assertMemberSelfAccess(ctx, memberId);
    const snap = await this.collection()
      .where("gymId", "==", gymId)
      .where("memberId", "==", memberId)
      .where("status", "==", "COMPLETED")
      .orderBy("completedAt", "desc")
      .limit(limit)
      .get();
    return snap.docs
      .map((d) => this.fromSnapshot(d.id, d.data()))
      .filter((d): d is DocWithId<WorkoutSessionDoc> => d !== null);
  }

  async createSession(
    ctx: FirestoreContext,
    gymId: string,
    id: string,
    input: CreateWorkoutSessionInput,
  ): Promise<DocWithId<WorkoutSessionDoc>> {
    const now = Timestamp.now();
    return this.create(ctx, gymId, id, {
      gymId,
      memberId: input.memberId,
      workoutPlanId: input.workoutPlanId,
      workoutPlanDayId: input.workoutPlanDayId,
      status: "IN_PROGRESS",
      startedAt: now,
      completedAt: null,
      durationSeconds: null,
      exercises: input.exercises,
    });
  }

  async updateSession(
    ctx: FirestoreContext,
    gymId: string,
    id: string,
    patch: Partial<
      Pick<
        WorkoutSessionDoc,
        | "status"
        | "completedAt"
        | "durationSeconds"
        | "exercises"
        | "workoutPlanDayId"
      >
    >,
  ): Promise<DocWithId<WorkoutSessionDoc>> {
    return this.update(ctx, gymId, id, patch);
  }

  /** Upsert a set log inside embedded session exercises (Step 5). */
  async upsertSetLogInTransaction(
    tx: Transaction,
    ctx: FirestoreContext,
    gymId: string,
    sessionId: string,
    sessionExerciseId: string,
    setNumber: number,
    log: Omit<WorkoutSetLogEmbedded, "setNumber" | "loggedAt">,
  ): Promise<void> {
    assertTenantAccess(ctx, gymId);
    const ref = this.docRef(sessionId);
    const snap = await tx.get(ref);
    if (!snap.exists) {
      throw new DocumentNotFoundError(COLLECTIONS.workoutSessions, sessionId);
    }
    const session = snap.data() as WorkoutSessionDoc;
    if (session.gymId !== gymId) {
      throw new DocumentNotFoundError(COLLECTIONS.workoutSessions, sessionId);
    }
    if (session.status !== "IN_PROGRESS") {
      throw new DocumentNotFoundError(COLLECTIONS.workoutSessions, sessionId);
    }
    if (ctx.kind === "member" && session.memberId !== ctx.memberId) {
      throw new DocumentNotFoundError(COLLECTIONS.workoutSessions, sessionId);
    }

    const exercises = session.exercises.map((exercise) => {
      if (exercise.id !== sessionExerciseId) return exercise;
      const sets = [...exercise.sets];
      const idx = sets.findIndex((s) => s.setNumber === setNumber);
      const entry: WorkoutSetLogEmbedded = omitUndefined({
        setNumber,
        weightKg: log.weightKg ?? null,
        durationSeconds: log.durationSeconds ?? null,
        loggedAt: Timestamp.now(),
      });
      if (idx >= 0) {
        sets[idx] = entry;
      } else {
        sets.push(entry);
        sets.sort((a, b) => a.setNumber - b.setNumber);
      }
      return { ...exercise, sets };
    });

    tx.update(ref, {
      exercises,
    });
  }

  async completeSessionInTransaction(
    tx: Transaction,
    ctx: FirestoreContext,
    gymId: string,
    sessionId: string,
    durationSeconds: number | null,
  ): Promise<void> {
    assertTenantAccess(ctx, gymId);
    const ref = this.docRef(sessionId);
    const snap = await tx.get(ref);
    if (!snap.exists) {
      throw new DocumentNotFoundError(COLLECTIONS.workoutSessions, sessionId);
    }
    const session = snap.data() as WorkoutSessionDoc;
    if (session.gymId !== gymId) {
      throw new DocumentNotFoundError(COLLECTIONS.workoutSessions, sessionId);
    }
    if (session.status !== "IN_PROGRESS") {
      throw new DocumentNotFoundError(COLLECTIONS.workoutSessions, sessionId);
    }
    if (ctx.kind === "member" && session.memberId !== ctx.memberId) {
      throw new DocumentNotFoundError(COLLECTIONS.workoutSessions, sessionId);
    }

    tx.update(ref, omitUndefined({
      status: "COMPLETED" satisfies WorkoutSessionStatus,
      completedAt: Timestamp.now(),
      durationSeconds,
    }));
  }
}
