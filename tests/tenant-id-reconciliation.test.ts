import { beforeEach, describe, expect, it, vi } from "vitest";
import { Role } from "@prisma/client";

import {
  analyzeStaffAlignment,
  buildGymReconcilePlan,
  buildStaffReconcilePlan,
  formatTenantReconcileBundle,
  parseTenantIdReconcileCliArgs,
  TenantIdReconcileNotConfirmedError,
  assertTenantIdReconcileApplyConfirmed,
} from "@/lib/seed/tenant-id-reconciliation";
import {
  applyStaffReconcilePlan,
  rekeyPostgresStaffUser,
} from "@/lib/seed/tenant-id-reconciliation-apply";

const firestoreOwner = {
  id: "firestore-owner-id",
  email: "owner@gym.test",
  gymId: "firestore-gym-id",
  name: "Gym Owner",
  role: "OWNER",
  passwordHash: "firestore-hash",
};

const legacyPostgresOwner = {
  id: "legacy-cuid-user-id",
  email: "owner@gym.test",
  gymId: "gym_default_0000000001",
  name: "Gym Owner",
  role: Role.OWNER,
};

describe("analyzeStaffAlignment", () => {
  it("returns aligned when Firestore and Postgres ids match", () => {
    const aligned = analyzeStaffAlignment({
      firestore: firestoreOwner,
      postgres: {
        ...legacyPostgresOwner,
        id: firestoreOwner.id,
        gymId: firestoreOwner.gymId,
      },
    });

    expect(aligned).toEqual({ kind: "aligned" });
  });

  it("detects legacy same-email user id mismatch", () => {
    const issue = analyzeStaffAlignment({
      firestore: firestoreOwner,
      postgres: legacyPostgresOwner,
    });

    expect(issue).toEqual({
      kind: "user_id_mismatch",
      email: firestoreOwner.email,
      firestoreUserId: firestoreOwner.id,
      postgresUserId: legacyPostgresOwner.id,
    });
  });
});

describe("buildGymReconcilePlan", () => {
  it("returns null when gym ids already match", () => {
    const plan = buildGymReconcilePlan({
      firestore: {
        id: "same-gym",
        name: "Gym",
        registrationToken: "reg",
        ownerEmail: firestoreOwner.email,
      },
      legacyPostgresGymId: "same-gym",
      rowCounts: {
        User: 1,
        Member: 0,
        Package: 0,
        Subscription: 0,
        Payment: 0,
        Receipt: 0,
        GymProfile: 0,
        Visitor: 0,
        Employee: 0,
        GymEvent: 0,
        LedgerTransaction: 0,
        Exercise: 0,
        WorkoutPlan: 0,
        WorkoutPlanDay: 0,
        WorkoutPlanExercise: 0,
        DietPlan: 0,
        WorkoutSession: 0,
        WorkoutSessionExercise: 0,
        WorkoutSetLog: 0,
      },
      targetGymAlreadyExists: false,
    });

    expect(plan).toBeNull();
  });
});

describe("buildStaffReconcilePlan", () => {
  it("returns null for already aligned staff", () => {
    const plan = buildStaffReconcilePlan({
      firestore: firestoreOwner,
      postgres: {
        ...legacyPostgresOwner,
        id: firestoreOwner.id,
        gymId: firestoreOwner.gymId,
      },
      gymName: "Gym #1",
    });

    expect(plan).toBeNull();
  });

  it("plans user re-key using PostgreSQL ON UPDATE CASCADE", () => {
    const plan = buildStaffReconcilePlan({
      firestore: firestoreOwner,
      postgres: legacyPostgresOwner,
      gymName: "Gym #1",
      registrationToken: "reg-token",
    });

    expect(plan).toMatchObject({
      email: firestoreOwner.email,
      rekeyUser: true,
      updateUserGymIdOnly: false,
    });
    expect(plan?.foreignKeyUpdates).toHaveLength(5);
  });
});

describe("rekeyPostgresStaffUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates User.id directly and relies on ON UPDATE CASCADE", async () => {
    const tx = {
      user: { findUnique: vi.fn(async () => null) },
      member: { count: vi.fn() },
      ledgerTransaction: { count: vi.fn() },
      subscription: { count: vi.fn() },
      payment: { count: vi.fn() },
      $executeRaw: vi.fn(async () => 1),
    };

    tx.member.count.mockResolvedValue(1);
    tx.ledgerTransaction.count.mockResolvedValue(2);
    tx.subscription.count.mockResolvedValueOnce(3).mockResolvedValueOnce(4);
    tx.payment.count.mockResolvedValue(5);

    const result = await rekeyPostgresStaffUser(tx as never, {
      oldId: legacyPostgresOwner.id,
      firestore: firestoreOwner,
    });

    expect(tx.$executeRaw).toHaveBeenCalled();
    expect(result.memberTrainerRows).toBe(1);
    expect(result.ledgerRows).toBe(2);
  });
});

describe("applyStaffReconcilePlan", () => {
  it("does not write in dry-run mode", async () => {
    const plan = buildStaffReconcilePlan({
      firestore: firestoreOwner,
      postgres: legacyPostgresOwner,
      gymName: "Gym #1",
    });
    expect(plan).not.toBeNull();

    const prisma = {
      user: { findUnique: vi.fn(async () => null) },
      member: { count: vi.fn(async () => 0) },
      ledgerTransaction: { count: vi.fn(async () => 0) },
      subscription: { count: vi.fn(async () => 0) },
      payment: { count: vi.fn(async () => 0) },
      $transaction: vi.fn(),
    };

    const result = await applyStaffReconcilePlan(prisma as never, {
      plan: plan!,
      firestore: firestoreOwner,
      dryRun: true,
    });

    expect(result.dryRun).toBe(true);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe("tenant reconcile reporting", () => {
  it("formats a tenant bundle with gym row counts and staff realignment", () => {
    const formatted = formatTenantReconcileBundle({
      firestoreGymId: firestoreOwner.gymId,
      legacyPostgresGymId: "gym_default_0000000001",
      ownerEmail: firestoreOwner.email,
      gym: buildGymReconcilePlan({
        firestore: {
          id: firestoreOwner.gymId,
          name: "Gym #1",
          registrationToken: "reg",
          ownerEmail: firestoreOwner.email,
        },
        legacyPostgresGymId: "gym_default_0000000001",
        rowCounts: {
          User: 1,
          Member: 2,
          Package: 1,
          Subscription: 0,
          Payment: 0,
          Receipt: 0,
          GymProfile: 0,
          Visitor: 0,
          Employee: 0,
          GymEvent: 0,
          LedgerTransaction: 1,
          Exercise: 0,
          WorkoutPlan: 0,
          WorkoutPlanDay: 0,
          WorkoutPlanExercise: 0,
          DietPlan: 0,
          WorkoutSession: 0,
          WorkoutSessionExercise: 0,
          WorkoutSetLog: 0,
        },
        targetGymAlreadyExists: false,
      }),
      staff: [
        buildStaffReconcilePlan({
          firestore: firestoreOwner,
          postgres: legacyPostgresOwner,
          gymName: "Gym #1",
        })!,
      ],
    });

    expect(formatted).toContain("LEGACY TENANT");
    expect(formatted).toContain("ROWS TO MIGRATE");
    expect(formatted).toContain("Member: 2");
    expect(formatted).toContain("STAFF ID REALIGNMENT");
  });
});

describe("tenant id reconcile CLI safeguards", () => {
  it("defaults to dry-run", () => {
    expect(parseTenantIdReconcileCliArgs([])).toMatchObject({ dryRun: true });
  });

  it("requires explicit confirmation for apply mode", () => {
    expect(() =>
      assertTenantIdReconcileApplyConfirmed({
        help: false,
        dryRun: false,
        applyRequested: true,
        confirm: false,
      }),
    ).toThrow(TenantIdReconcileNotConfirmedError);
  });
});
