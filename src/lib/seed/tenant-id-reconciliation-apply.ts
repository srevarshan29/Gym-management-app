import type { Prisma, PrismaClient } from "@prisma/client";

import { ensurePostgresGym } from "@/lib/seed/postgres-tenant-mirror";
import {
  buildGymReconcilePlan,
  buildStaffReconcilePlan,
  mapFirestoreStaffRole,
  TenantReconcileCollisionError,
  type FirestoreGymSnapshot,
  type FirestoreStaffSnapshot,
  type GymReconcilePlan,
  type GymScopedRowCounts,
  type StaffReconcilePlan,
  type TenantReconcileBundle,
  hasMeaningfulTenantData,
} from "@/lib/seed/tenant-id-reconciliation";

export type ReassignUserForeignKeysResult = {
  memberTrainerRows: number;
  ledgerRows: number;
  subscriptionCreatedByRows: number;
  subscriptionWrittenOffByRows: number;
  paymentRecordedByRows: number;
};

type TransactionClient = Prisma.TransactionClient;

/** Count rows per gym-scoped Postgres table for dry-run reporting. */
export async function countPostgresGymScopedRows(
  client: Pick<
    PrismaClient,
    | "user"
    | "member"
    | "package"
    | "subscription"
    | "payment"
    | "receipt"
    | "gymProfile"
    | "visitor"
    | "employee"
    | "gymEvent"
    | "ledgerTransaction"
    | "exercise"
    | "workoutPlan"
    | "workoutPlanDay"
    | "workoutPlanExercise"
    | "dietPlan"
    | "$queryRaw"
  >,
  gymId: string,
): Promise<GymScopedRowCounts> {
  const [
    user,
    member,
    packageCount,
    subscription,
    payment,
    receipt,
    gymProfile,
    visitor,
    employee,
    gymEvent,
    ledgerTransaction,
    exercise,
    workoutPlan,
    workoutPlanDay,
    workoutPlanExercise,
    dietPlan,
    workoutSessionRows,
    workoutSessionExerciseRows,
    workoutSetLogRows,
  ] = await Promise.all([
    client.user.count({ where: { gymId } }),
    client.member.count({ where: { gymId } }),
    client.package.count({ where: { gymId } }),
    client.subscription.count({ where: { gymId } }),
    client.payment.count({ where: { gymId } }),
    client.receipt.count({ where: { gymId } }),
    client.gymProfile.count({ where: { gymId } }),
    client.visitor.count({ where: { gymId } }),
    client.employee.count({ where: { gymId } }),
    client.gymEvent.count({ where: { gymId } }),
    client.ledgerTransaction.count({ where: { gymId } }),
    client.exercise.count({ where: { gymId } }),
    client.workoutPlan.count({ where: { gymId } }),
    client.workoutPlanDay.count({ where: { gymId } }),
    client.workoutPlanExercise.count({ where: { gymId } }),
    client.dietPlan.count({ where: { gymId } }),
    client.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM "WorkoutSession" WHERE "gymId" = ${gymId}
    `,
    client.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM "WorkoutSessionExercise" WHERE "gymId" = ${gymId}
    `,
    client.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM "WorkoutSetLog" WHERE "gymId" = ${gymId}
    `,
  ]);

  return {
    User: user,
    Member: member,
    Package: packageCount,
    Subscription: subscription,
    Payment: payment,
    Receipt: receipt,
    GymProfile: gymProfile,
    Visitor: visitor,
    Employee: employee,
    GymEvent: gymEvent,
    LedgerTransaction: ledgerTransaction,
    Exercise: exercise,
    WorkoutPlan: workoutPlan,
    WorkoutPlanDay: workoutPlanDay,
    WorkoutPlanExercise: workoutPlanExercise,
    DietPlan: dietPlan,
    WorkoutSession: Number(workoutSessionRows[0]?.count ?? 0),
    WorkoutSessionExercise: Number(workoutSessionExerciseRows[0]?.count ?? 0),
    WorkoutSetLog: Number(workoutSetLogRows[0]?.count ?? 0),
  };
}

export async function countPostgresUserForeignKeyRows(
  client: Pick<
    PrismaClient,
    "member" | "ledgerTransaction" | "subscription" | "payment"
  >,
  userId: string,
): Promise<ReassignUserForeignKeysResult> {
  const [
    memberTrainerRows,
    ledgerRows,
    subscriptionCreatedByRows,
    subscriptionWrittenOffByRows,
    paymentRecordedByRows,
  ] = await Promise.all([
    client.member.count({ where: { trainerId: userId } }),
    client.ledgerTransaction.count({ where: { createdById: userId } }),
    client.subscription.count({ where: { createdById: userId } }),
    client.subscription.count({ where: { writtenOffById: userId } }),
    client.payment.count({ where: { recordedById: userId } }),
  ]);

  return {
    memberTrainerRows,
    ledgerRows,
    subscriptionCreatedByRows,
    subscriptionWrittenOffByRows,
    paymentRecordedByRows,
  };
}

async function updateDenormalizedGymIds(
  tx: TransactionClient,
  sourceGymId: string,
  targetGymId: string,
): Promise<{ workoutSessionRows: number; workoutSessionExerciseRows: number; workoutSetLogRows: number }> {
  const workoutSessionRows = Number(
    (
      await tx.$executeRaw`
        UPDATE "WorkoutSession"
        SET "gymId" = ${targetGymId}
        WHERE "gymId" = ${sourceGymId}
      `
    ) ?? 0,
  );
  const workoutSessionExerciseRows = Number(
    (
      await tx.$executeRaw`
        UPDATE "WorkoutSessionExercise"
        SET "gymId" = ${targetGymId}
        WHERE "gymId" = ${sourceGymId}
      `
    ) ?? 0,
  );
  const workoutSetLogRows = Number(
    (
      await tx.$executeRaw`
        UPDATE "WorkoutSetLog"
        SET "gymId" = ${targetGymId}
        WHERE "gymId" = ${sourceGymId}
      `
    ) ?? 0,
  );

  return { workoutSessionRows, workoutSessionExerciseRows, workoutSetLogRows };
}

async function movePrismaGymScopedRows(
  tx: TransactionClient,
  sourceGymId: string,
  targetGymId: string,
): Promise<void> {
  await tx.user.updateMany({
    where: { gymId: sourceGymId },
    data: { gymId: targetGymId },
  });
  await tx.member.updateMany({
    where: { gymId: sourceGymId },
    data: { gymId: targetGymId },
  });
  await tx.package.updateMany({
    where: { gymId: sourceGymId },
    data: { gymId: targetGymId },
  });
  await tx.subscription.updateMany({
    where: { gymId: sourceGymId },
    data: { gymId: targetGymId },
  });
  await tx.payment.updateMany({
    where: { gymId: sourceGymId },
    data: { gymId: targetGymId },
  });
  await tx.receipt.updateMany({
    where: { gymId: sourceGymId },
    data: { gymId: targetGymId },
  });
  await tx.gymProfile.updateMany({
    where: { gymId: sourceGymId },
    data: { gymId: targetGymId },
  });
  await tx.visitor.updateMany({
    where: { gymId: sourceGymId },
    data: { gymId: targetGymId },
  });
  await tx.employee.updateMany({
    where: { gymId: sourceGymId },
    data: { gymId: targetGymId },
  });
  await tx.gymEvent.updateMany({
    where: { gymId: sourceGymId },
    data: { gymId: targetGymId },
  });
  await tx.ledgerTransaction.updateMany({
    where: { gymId: sourceGymId },
    data: { gymId: targetGymId },
  });
  await tx.exercise.updateMany({
    where: { gymId: sourceGymId },
    data: { gymId: targetGymId },
  });
  await tx.workoutPlan.updateMany({
    where: { gymId: sourceGymId },
    data: { gymId: targetGymId },
  });
  await tx.workoutPlanDay.updateMany({
    where: { gymId: sourceGymId },
    data: { gymId: targetGymId },
  });
  await tx.workoutPlanExercise.updateMany({
    where: { gymId: sourceGymId },
    data: { gymId: targetGymId },
  });
  await tx.dietPlan.updateMany({
    where: { gymId: sourceGymId },
    data: { gymId: targetGymId },
  });
}

async function mergeGymCounters(
  tx: TransactionClient,
  sourceGymId: string,
  targetGymId: string,
): Promise<void> {
  const [source, target] = await Promise.all([
    tx.gym.findUnique({ where: { id: sourceGymId } }),
    tx.gym.findUnique({ where: { id: targetGymId } }),
  ]);
  if (!source || !target) return;

  await tx.gym.update({
    where: { id: targetGymId },
    data: {
      memberSeq: Math.max(source.memberSeq, target.memberSeq),
      receiptSeq: Math.max(source.receiptSeq, target.receiptSeq),
    },
  });
}

export async function assertGymReconcileCollisions(
  client: Pick<PrismaClient, "gym" | "user" | "gymProfile">,
  params: {
    plan: GymReconcilePlan;
  },
): Promise<void> {
  const { plan } = params;
  const [sourceGym, targetGym] = await Promise.all([
    client.gym.findUnique({ where: { id: plan.legacyPostgresGymId } }),
    client.gym.findUnique({ where: { id: plan.firestoreGymId } }),
  ]);

  if (!sourceGym) {
    throw new TenantReconcileCollisionError(
      `Legacy Postgres gym ${plan.legacyPostgresGymId} not found.`,
    );
  }

  if (targetGym && targetGym.id !== sourceGym.id) {
    const targetCounts = await countPostgresGymScopedRows(client as PrismaClient, targetGym.id);
    if (hasMeaningfulTenantData(targetCounts)) {
      const targetOwners = await client.user.findMany({
        where: { gymId: targetGym.id, role: "OWNER" },
      });
      const sameOwner = targetOwners.some((owner) => owner.email === plan.ownerEmail);
      if (!sameOwner) {
        throw new TenantReconcileCollisionError(
          `Target gym ${plan.firestoreGymId} already has tenant data for a different owner.`,
        );
      }
    }

    if (plan.strategy === "move_rows_to_existing_gym") {
      const [sourceProfileCount, targetProfileCount] = await Promise.all([
        client.gymProfile.count({ where: { gymId: plan.legacyPostgresGymId } }),
        client.gymProfile.count({ where: { gymId: plan.firestoreGymId } }),
      ]);
      if (sourceProfileCount > 0 && targetProfileCount > 0) {
        throw new TenantReconcileCollisionError(
          `Both legacy gym ${plan.legacyPostgresGymId} and target gym ${plan.firestoreGymId} have GymProfile rows.`,
        );
      }
    }
  }
}

export async function assertStaffReconcileCollisions(
  client: Pick<PrismaClient, "user">,
  params: {
    plan: StaffReconcilePlan;
    firestore: FirestoreStaffSnapshot;
  },
): Promise<void> {
  const { plan, firestore } = params;

  if (!plan.rekeyUser) return;

  const targetUser = await client.user.findUnique({
    where: { id: plan.firestoreUserId },
  });
  if (targetUser) {
    if (targetUser.email !== firestore.email) {
      throw new TenantReconcileCollisionError(
        `Target user id ${plan.firestoreUserId} already exists for ${targetUser.email}.`,
      );
    }
    if (targetUser.gymId && targetUser.gymId !== firestore.gymId) {
      throw new TenantReconcileCollisionError(
        `Target user id ${plan.firestoreUserId} belongs to gym ${targetUser.gymId}, not ${firestore.gymId}.`,
      );
    }
  }
}

/**
 * Re-key Postgres User.id using PostgreSQL ON UPDATE CASCADE on dependent FKs.
 * Dependent FK columns must NOT be pre-updated to the new id (that would violate FK checks).
 */
export async function rekeyPostgresStaffUser(
  tx: TransactionClient,
  params: {
    oldId: string;
    firestore: FirestoreStaffSnapshot;
  },
): Promise<ReassignUserForeignKeysResult> {
  const { oldId, firestore } = params;
  const newId = firestore.id;

  if (oldId === newId) {
    return {
      memberTrainerRows: 0,
      ledgerRows: 0,
      subscriptionCreatedByRows: 0,
      subscriptionWrittenOffByRows: 0,
      paymentRecordedByRows: 0,
    };
  }

  const targetExists = await tx.user.findUnique({ where: { id: newId } });
  if (targetExists) {
    throw new TenantReconcileCollisionError(
      `Cannot re-key Postgres user ${oldId} → ${newId}: target id already exists.`,
    );
  }

  const beforeCounts = await countPostgresUserForeignKeyRows(tx, oldId);
  const role = mapFirestoreStaffRole(firestore.role);

  await tx.$executeRaw`
    UPDATE "User"
    SET
      id = ${newId},
      "gymId" = ${firestore.gymId},
      name = ${firestore.name},
      role = CAST(${role} AS "Role"),
      "passwordHash" = ${firestore.passwordHash},
      "updatedAt" = NOW()
    WHERE id = ${oldId}
  `;

  return beforeCounts;
}

export type ApplyGymReconcileResult = {
  plan: GymReconcilePlan;
  dryRun: boolean;
  denormalizedUpdates?: {
    workoutSessionRows: number;
    workoutSessionExerciseRows: number;
    workoutSetLogRows: number;
  };
};

export async function applyGymReconcilePlan(
  prisma: PrismaClient,
  params: {
    plan: GymReconcilePlan;
    dryRun: boolean;
  },
): Promise<ApplyGymReconcileResult> {
  const { plan, dryRun } = params;

  await assertGymReconcileCollisions(prisma, { plan });

  if (dryRun) {
    return { plan, dryRun: true };
  }

  return prisma.$transaction(async (tx) => {
    if (plan.strategy === "rekey_gym_primary_key") {
      await tx.gym.update({
        where: { id: plan.legacyPostgresGymId },
        data: {
          id: plan.firestoreGymId,
          name: plan.gymName,
          registrationToken: plan.registrationToken,
        },
      });
    } else {
      await ensurePostgresGym(tx, {
        gymId: plan.firestoreGymId,
        name: plan.gymName,
        registrationToken: plan.registrationToken,
      });
      await movePrismaGymScopedRows(tx, plan.legacyPostgresGymId, plan.firestoreGymId);
      await mergeGymCounters(tx, plan.legacyPostgresGymId, plan.firestoreGymId);
      await tx.gym.update({
        where: { id: plan.firestoreGymId },
        data: {
          name: plan.gymName,
          registrationToken: plan.registrationToken,
        },
      });
    }

    const denormalizedUpdates = await updateDenormalizedGymIds(
      tx,
      plan.legacyPostgresGymId,
      plan.firestoreGymId,
    );

    return { plan, dryRun: false, denormalizedUpdates };
  });
}

export type ApplyStaffReconcileResult = {
  plan: StaffReconcilePlan;
  dryRun: boolean;
  gymEnsured: boolean;
  userRekeyed: boolean;
  gymIdUpdated: boolean;
  foreignKeyUpdates?: ReassignUserForeignKeysResult;
};

export async function applyStaffReconcilePlan(
  prisma: PrismaClient,
  params: {
    plan: StaffReconcilePlan;
    firestore: FirestoreStaffSnapshot;
    dryRun: boolean;
  },
): Promise<ApplyStaffReconcileResult> {
  const { plan, firestore, dryRun } = params;

  await assertStaffReconcileCollisions(prisma, { plan, firestore });

  if (dryRun) {
    const foreignKeyUpdates = plan.rekeyUser
      ? await countPostgresUserForeignKeyRows(prisma, plan.postgresUserId)
      : undefined;
    return {
      plan,
      dryRun: true,
      gymEnsured: true,
      userRekeyed: plan.rekeyUser,
      gymIdUpdated: plan.updateUserGymIdOnly,
      foreignKeyUpdates,
    };
  }

  return prisma.$transaction(async (tx) => {
    await ensurePostgresGym(tx, plan.ensureGym);

    if (plan.rekeyUser) {
      const foreignKeyUpdates = await rekeyPostgresStaffUser(tx, {
        oldId: plan.postgresUserId,
        firestore,
      });
      return {
        plan,
        dryRun: false,
        gymEnsured: true,
        userRekeyed: true,
        gymIdUpdated: true,
        foreignKeyUpdates,
      };
    }

    if (plan.updateUserGymIdOnly) {
      await tx.user.update({
        where: { id: plan.postgresUserId },
        data: { gymId: plan.firestoreGymId },
      });
      return {
        plan,
        dryRun: false,
        gymEnsured: true,
        userRekeyed: false,
        gymIdUpdated: true,
      };
    }

    return {
      plan,
      dryRun: false,
      gymEnsured: true,
      userRekeyed: false,
      gymIdUpdated: false,
    };
  });
}

export async function detectTenantReconcileBundles(params: {
  prisma: PrismaClient;
  firestoreGyms: FirestoreGymSnapshot[];
  firestoreStaff: FirestoreStaffSnapshot[];
}): Promise<TenantReconcileBundle[]> {
  const bundles: TenantReconcileBundle[] = [];

  for (const firestoreGym of params.firestoreGyms) {
    const ownerCandidates = await params.prisma.user.findMany({
      where: {
        email: firestoreGym.ownerEmail,
        role: "OWNER",
      },
    });

    if (ownerCandidates.length === 0) continue;
    if (ownerCandidates.length > 1) {
      throw new TenantReconcileCollisionError(
        `Ambiguous owner email match for ${firestoreGym.ownerEmail}: multiple Postgres OWNER rows.`,
      );
    }

    const owner = ownerCandidates[0]!;
    if (owner.email !== firestoreGym.ownerEmail) continue;
    if (!owner.gymId) continue;

    const legacyPostgresGymId = owner.gymId;
    const targetGym = await params.prisma.gym.findUnique({
      where: { id: firestoreGym.id },
    });

    const gymPlan = buildGymReconcilePlan({
      firestore: firestoreGym,
      legacyPostgresGymId,
      rowCounts: await countPostgresGymScopedRows(params.prisma, legacyPostgresGymId),
      targetGymAlreadyExists: Boolean(targetGym && targetGym.id !== legacyPostgresGymId),
    });

    const staffForGym = params.firestoreStaff.filter(
      (staff) => staff.gymId === firestoreGym.id,
    );
    const staffPlans: StaffReconcilePlan[] = [];

    for (const firestoreStaff of staffForGym) {
      const postgres = await params.prisma.user.findUnique({
        where: { email: firestoreStaff.email },
      });
      if (!postgres) continue;
      if (postgres.email !== firestoreStaff.email) continue;

      const plan = buildStaffReconcilePlan({
        firestore: firestoreStaff,
        postgres: {
          id: postgres.id,
          email: postgres.email,
          gymId: postgres.gymId,
          name: postgres.name,
          role: postgres.role,
        },
        gymName: firestoreGym.name,
        registrationToken: firestoreGym.registrationToken,
      });
      if (plan) staffPlans.push(plan);
    }

    if (gymPlan || staffPlans.length > 0) {
      bundles.push({
        firestoreGymId: firestoreGym.id,
        legacyPostgresGymId,
        ownerEmail: firestoreGym.ownerEmail,
        gym: gymPlan,
        staff: staffPlans,
      });
    }
  }

  return bundles;
}
