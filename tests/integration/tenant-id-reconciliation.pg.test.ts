import { afterAll, beforeAll, expect, it } from "vitest";

import {
  applyGymReconcilePlan,
  applyStaffReconcilePlan,
  countPostgresGymScopedRows,
  detectTenantReconcileBundles,
  rekeyPostgresStaffUser,
} from "@/lib/seed/tenant-id-reconciliation-apply";
import {
  buildGymReconcilePlan,
  TenantReconcileCollisionError,
  type FirestoreGymSnapshot,
  type FirestoreStaffSnapshot,
} from "@/lib/seed/tenant-id-reconciliation";
import {
  createIntegrationPrismaClient,
  getTenantReconcileIntegrationDatabaseUrl,
  integrationDescribe,
  uniqueIntegrationId,
} from "./helpers/reconcile-pg-test-db";
import {
  DurationUnit,
  LedgerTransactionType,
  PaymentMethod,
  Role,
} from "@prisma/client";

const describePg = integrationDescribe();

describePg("tenant id reconciliation — PostgreSQL integration", () => {
  let prisma: ReturnType<typeof createIntegrationPrismaClient>;

  beforeAll(async () => {
    if (!getTenantReconcileIntegrationDatabaseUrl()) return;
    prisma = createIntegrationPrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    if (!prisma) return;
    await prisma.$disconnect();
  });

  async function seedLegacyTenant(params: {
    legacyGymId: string;
    firestoreGymId: string;
    legacyUserId: string;
    firestoreUserId: string;
    ownerEmail: string;
    unrelatedGymId: string;
  }) {
    const memberId = uniqueIntegrationId("member");
    const packageId = uniqueIntegrationId("package");
    const subscriptionId = uniqueIntegrationId("subscription");
    const paymentId = uniqueIntegrationId("payment");
    const ledgerId = uniqueIntegrationId("ledger");
    const workoutPlanId = uniqueIntegrationId("wplan");
    const sessionId = uniqueIntegrationId("wsession");

    await prisma.gym.create({
      data: {
        id: params.legacyGymId,
        name: "Legacy Gym",
        registrationToken: uniqueIntegrationId("reg"),
      },
    });
    await prisma.gym.create({
      data: {
        id: params.unrelatedGymId,
        name: "Unrelated Gym",
        registrationToken: uniqueIntegrationId("reg"),
      },
    });
    await prisma.user.create({
      data: {
        id: params.legacyUserId,
        gymId: params.legacyGymId,
        email: params.ownerEmail,
        name: "Legacy Owner",
        passwordHash: "legacy-hash",
        role: Role.OWNER,
      },
    });
    await prisma.member.create({
      data: {
        id: memberId,
        gymId: params.legacyGymId,
        memberNumber: 1,
        name: "Member One",
        phone: "9999999999",
        trainerId: params.legacyUserId,
      },
    });
    await prisma.package.create({
      data: {
        id: packageId,
        gymId: params.legacyGymId,
        name: "Monthly",
        price: 1000,
        durationValue: 1,
        durationUnit: DurationUnit.MONTHS,
      },
    });
    await prisma.subscription.create({
      data: {
        id: subscriptionId,
        gymId: params.legacyGymId,
        memberId,
        packageId,
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-02-01"),
        priceAtPurchase: 1000,
        createdById: params.legacyUserId,
        writtenOffById: params.legacyUserId,
      },
    });
    await prisma.payment.create({
      data: {
        id: paymentId,
        gymId: params.legacyGymId,
        memberId,
        subscriptionId,
        amount: 500,
        method: PaymentMethod.CASH,
        recordedById: params.legacyUserId,
      },
    });
    await prisma.ledgerTransaction.create({
      data: {
        id: ledgerId,
        gymId: params.legacyGymId,
        type: LedgerTransactionType.INCOME,
        category: "Rent",
        amount: 100,
        occurredOn: new Date("2026-01-15"),
        createdById: params.legacyUserId,
      },
    });
    await prisma.workoutPlan.create({
      data: {
        id: workoutPlanId,
        gymId: params.legacyGymId,
        memberId,
        title: "Plan",
      },
    });
    await prisma.$executeRaw`
      INSERT INTO "WorkoutSession" (id, "gymId", "memberId", "workoutPlanId", status, "startedAt")
      VALUES (${sessionId}, ${params.legacyGymId}, ${memberId}, ${workoutPlanId}, 'IN_PROGRESS', NOW())
    `;

    return {
      memberId,
      packageId,
      subscriptionId,
      paymentId,
      ledgerId,
      workoutPlanId,
      sessionId,
    };
  }

  async function cleanupTenant(gymIds: string[], userIds: string[]) {
    for (const gymId of gymIds) {
      await prisma.$executeRaw`DELETE FROM "WorkoutSetLog" WHERE "gymId" = ${gymId}`;
      await prisma.$executeRaw`DELETE FROM "WorkoutSessionExercise" WHERE "gymId" = ${gymId}`;
      await prisma.$executeRaw`DELETE FROM "WorkoutSession" WHERE "gymId" = ${gymId}`;
      await prisma.workoutPlanExercise.deleteMany({ where: { gymId } });
      await prisma.workoutPlanDay.deleteMany({ where: { gymId } });
      await prisma.workoutPlan.deleteMany({ where: { gymId } });
      await prisma.ledgerTransaction.deleteMany({ where: { gymId } });
      await prisma.payment.deleteMany({ where: { gymId } });
      await prisma.subscription.deleteMany({ where: { gymId } });
      await prisma.package.deleteMany({ where: { gymId } });
      await prisma.member.deleteMany({ where: { gymId } });
      await prisma.user.deleteMany({ where: { gymId } });
      await prisma.gym.deleteMany({ where: { id: gymId } });
    }
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }

  it("rejects pre-updating User FK columns before the target User.id exists", async () => {
    const legacyUserId = uniqueIntegrationId("legacy_user");
    const firestoreUserId = uniqueIntegrationId("firestore_user");
    const gymId = uniqueIntegrationId("gym");

    await prisma.gym.create({
      data: { id: gymId, name: "Gym", registrationToken: uniqueIntegrationId("reg") },
    });
    await prisma.user.create({
      data: {
        id: legacyUserId,
        gymId,
        email: `${legacyUserId}@test.local`,
        name: "Owner",
        passwordHash: "hash",
        role: Role.OWNER,
      },
    });
    await prisma.ledgerTransaction.create({
      data: {
        id: uniqueIntegrationId("ledger"),
        gymId,
        type: LedgerTransactionType.EXPENSE,
        category: "Test",
        amount: 10,
        occurredOn: new Date("2026-01-01"),
        createdById: legacyUserId,
      },
    });

    await expect(
      prisma.ledgerTransaction.updateMany({
        where: { createdById: legacyUserId },
        data: { createdById: firestoreUserId },
      }),
    ).rejects.toThrow();

    await cleanupTenant([gymId], [legacyUserId]);
  });

  it("re-keys legacy gym primary key and migrates all gym-scoped rows", async () => {
    const legacyGymId = uniqueIntegrationId("legacy_gym");
    const firestoreGymId = uniqueIntegrationId("firestore_gym");
    const legacyUserId = uniqueIntegrationId("legacy_user");
    const firestoreUserId = uniqueIntegrationId("firestore_user");
    const ownerEmail = `${uniqueIntegrationId("owner")}@test.local`;
    const unrelatedGymId = uniqueIntegrationId("other_gym");

    const seeded = await seedLegacyTenant({
      legacyGymId,
      firestoreGymId,
      legacyUserId,
      firestoreUserId,
      ownerEmail,
      unrelatedGymId,
    });

    const rowCounts = await countPostgresGymScopedRows(prisma, legacyGymId);
    expect(rowCounts.Member).toBe(1);
    expect(rowCounts.WorkoutSession).toBe(1);

    const plan = buildGymReconcilePlan({
      firestore: {
        id: firestoreGymId,
        name: "Firestore Gym",
        registrationToken: uniqueIntegrationId("fs_reg"),
        ownerEmail,
      },
      legacyPostgresGymId: legacyGymId,
      rowCounts,
      targetGymAlreadyExists: false,
    });
    expect(plan).not.toBeNull();

    await applyGymReconcilePlan(prisma, { plan: plan!, dryRun: false });

    const canonicalCounts = await countPostgresGymScopedRows(prisma, firestoreGymId);
    expect(canonicalCounts.Member).toBe(1);
    expect(canonicalCounts.Payment).toBe(1);
    expect(canonicalCounts.LedgerTransaction).toBe(1);
    expect(canonicalCounts.WorkoutSession).toBe(1);
    expect(await prisma.gym.findUnique({ where: { id: firestoreGymId } })).not.toBeNull();
    expect(await prisma.gym.findUnique({ where: { id: legacyGymId } })).toBeNull();

    const unrelatedCounts = await countPostgresGymScopedRows(prisma, unrelatedGymId);
    expect(unrelatedCounts.Member).toBe(0);

    const member = await prisma.member.findUnique({ where: { id: seeded.memberId } });
    expect(member?.gymId).toBe(firestoreGymId);

    await applyGymReconcilePlan(prisma, { plan: plan!, dryRun: false });

    await cleanupTenant([firestoreGymId, unrelatedGymId], [legacyUserId]);
  });

  it("re-keys legacy user id with ON UPDATE CASCADE and preserves dependent rows", async () => {
    const gymId = uniqueIntegrationId("gym");
    const legacyUserId = uniqueIntegrationId("legacy_user");
    const firestoreUserId = uniqueIntegrationId("firestore_user");
    const ownerEmail = `${uniqueIntegrationId("owner")}@test.local`;

    await prisma.gym.create({
      data: { id: gymId, name: "Gym", registrationToken: uniqueIntegrationId("reg") },
    });
    await prisma.user.create({
      data: {
        id: legacyUserId,
        gymId,
        email: ownerEmail,
        name: "Owner",
        passwordHash: "legacy-hash",
        role: Role.OWNER,
      },
    });

    const memberId = uniqueIntegrationId("member");
    const packageId = uniqueIntegrationId("package");
    const subscriptionId = uniqueIntegrationId("subscription");
    const paymentId = uniqueIntegrationId("payment");
    const ledgerId = uniqueIntegrationId("ledger");

    await prisma.member.create({
      data: {
        id: memberId,
        gymId,
        memberNumber: 1,
        name: "Member",
        phone: "8888888888",
        trainerId: legacyUserId,
      },
    });
    await prisma.package.create({
      data: {
        id: packageId,
        gymId,
        name: "Monthly",
        price: 1000,
        durationValue: 1,
        durationUnit: DurationUnit.MONTHS,
      },
    });
    await prisma.subscription.create({
      data: {
        id: subscriptionId,
        gymId,
        memberId,
        packageId,
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-02-01"),
        priceAtPurchase: 1000,
        createdById: legacyUserId,
        writtenOffById: legacyUserId,
      },
    });
    await prisma.payment.create({
      data: {
        id: paymentId,
        gymId,
        memberId,
        subscriptionId,
        amount: 100,
        method: PaymentMethod.CASH,
        recordedById: legacyUserId,
      },
    });
    await prisma.ledgerTransaction.create({
      data: {
        id: ledgerId,
        gymId,
        type: LedgerTransactionType.INCOME,
        category: "Manual",
        amount: 50,
        occurredOn: new Date("2026-01-10"),
        createdById: legacyUserId,
      },
    });

    const firestore: FirestoreStaffSnapshot = {
      id: firestoreUserId,
      email: ownerEmail,
      gymId,
      name: "Owner",
      role: "OWNER",
      passwordHash: "firestore-hash",
    };

    await prisma.$transaction(async (tx) => {
      await rekeyPostgresStaffUser(tx, { oldId: legacyUserId, firestore });
    });

    expect(await prisma.user.findUnique({ where: { id: firestoreUserId } })).not.toBeNull();
    expect(await prisma.user.findUnique({ where: { id: legacyUserId } })).toBeNull();
    expect(
      (await prisma.member.findUnique({ where: { id: memberId } }))?.trainerId,
    ).toBe(firestoreUserId);
    expect(
      (await prisma.ledgerTransaction.findUnique({ where: { id: ledgerId } }))?.createdById,
    ).toBe(firestoreUserId);
    expect(
      (await prisma.subscription.findUnique({ where: { id: subscriptionId } }))?.createdById,
    ).toBe(firestoreUserId);
    expect(
      (await prisma.subscription.findUnique({ where: { id: subscriptionId } }))?.writtenOffById,
    ).toBe(firestoreUserId);
    expect(
      (await prisma.payment.findUnique({ where: { id: paymentId } }))?.recordedById,
    ).toBe(firestoreUserId);

    await prisma.$transaction(async (tx) => {
      await rekeyPostgresStaffUser(tx, { oldId: firestoreUserId, firestore });
    });

    await cleanupTenant([gymId], [firestoreUserId]);
  });

  it("fails closed when target user id already belongs to another email", async () => {
    const gymId = uniqueIntegrationId("gym");
    const legacyUserId = uniqueIntegrationId("legacy_user");
    const firestoreUserId = uniqueIntegrationId("firestore_user");

    await prisma.gym.create({
      data: { id: gymId, name: "Gym", registrationToken: uniqueIntegrationId("reg") },
    });
    await prisma.user.create({
      data: {
        id: legacyUserId,
        gymId,
        email: "legacy@test.local",
        name: "Legacy",
        passwordHash: "hash",
        role: Role.OWNER,
      },
    });
    await prisma.user.create({
      data: {
        id: firestoreUserId,
        gymId,
        email: "other@test.local",
        name: "Other",
        passwordHash: "hash",
        role: Role.STAFF,
      },
    });

    await expect(
      applyStaffReconcilePlan(prisma, {
        plan: {
          email: "legacy@test.local",
          firestoreUserId,
          postgresUserId: legacyUserId,
          firestoreGymId: gymId,
          postgresGymId: gymId,
          ensureGym: { gymId, name: "Gym" },
          rekeyUser: true,
          updateUserGymIdOnly: false,
          foreignKeyUpdates: [],
        },
        firestore: {
          id: firestoreUserId,
          email: "legacy@test.local",
          gymId,
          name: "Legacy",
          role: "OWNER",
          passwordHash: "hash",
        },
        dryRun: false,
      }),
    ).rejects.toBeInstanceOf(TenantReconcileCollisionError);

    await cleanupTenant([gymId], [legacyUserId, firestoreUserId]);
  });

  it("detects bundles by exact owner email and never merges different emails", async () => {
    const legacyGymId = uniqueIntegrationId("legacy_gym");
    const firestoreGymId = uniqueIntegrationId("firestore_gym");
    const legacyUserId = uniqueIntegrationId("legacy_user");
    const ownerEmail = `${uniqueIntegrationId("owner")}@test.local`;

    await prisma.gym.create({
      data: {
        id: legacyGymId,
        name: "Legacy Gym",
        registrationToken: uniqueIntegrationId("reg"),
      },
    });
    await prisma.user.create({
      data: {
        id: legacyUserId,
        gymId: legacyGymId,
        email: ownerEmail,
        name: "Owner",
        passwordHash: "hash",
        role: Role.OWNER,
      },
    });

    const firestoreGym: FirestoreGymSnapshot = {
      id: firestoreGymId,
      name: "Firestore Gym",
      registrationToken: uniqueIntegrationId("fs_reg"),
      ownerEmail,
    };
    const firestoreStaff: FirestoreStaffSnapshot[] = [
      {
        id: uniqueIntegrationId("firestore_user"),
        email: ownerEmail,
        gymId: firestoreGymId,
        name: "Owner",
        role: "OWNER",
        passwordHash: "hash",
      },
    ];

    const bundles = await detectTenantReconcileBundles({
      prisma,
      firestoreGyms: [firestoreGym],
      firestoreStaff,
    });

    expect(bundles).toHaveLength(1);
    expect(bundles[0]?.legacyPostgresGymId).toBe(legacyGymId);
    expect(bundles[0]?.staff[0]?.postgresUserId).toBe(legacyUserId);

    const noMatch = await detectTenantReconcileBundles({
      prisma,
      firestoreGyms: [{ ...firestoreGym, ownerEmail: "different@test.local" }],
      firestoreStaff,
    });
    expect(noMatch).toHaveLength(0);

    await cleanupTenant([legacyGymId], [legacyUserId]);
  });
});
