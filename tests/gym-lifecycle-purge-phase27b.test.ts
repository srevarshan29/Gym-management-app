import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { Timestamp } from "firebase-admin/firestore";

import {
  validateImmediateDeletionConfirmation,
  IMMEDIATE_DELETION_CONFIRM_PHRASE,
} from "@/lib/gym-lifecycle/gym-deletion-confirm";
import {
  canReactivateGym,
  deletionWaitingPeriodEndsAt,
  hasPendingScheduledDeletion,
  initialPurgeStatusForMode,
  isScheduledDeletionEligible,
} from "@/lib/gym-lifecycle/deletion-policy";
import { GYM_DELETION_WAITING_PERIOD_MS } from "@/lib/gym-lifecycle/deletion-types";
import {
  assertInventoryScopedToGym,
  assertNeverDeleteCollectionsSafe,
  runPurgePhase,
  runPurgeUntilIdle,
} from "@/lib/gym-lifecycle/purge/runner";
import { gymSupabaseStoragePrefix } from "@/lib/gym-lifecycle/purge/inventory";
import {
  assertTenantPurgeDestructionEnabled,
  GymPurgeDisabledError,
  isTenantPurgeDestructionEnabled,
} from "@/lib/gym-lifecycle/purge/config";
import { validateGymReactivateTransition } from "@/lib/gym-lifecycle/admin-transitions";
import { gymAllowsTenantAccess } from "@/lib/gym-lifecycle/status";
import type { GymPurgeProgress } from "@/lib/firestore/types";

describe("deletion waiting period", () => {
  it("uses a 30-day window", () => {
    const start = new Date("2026-01-01T00:00:00.000Z");
    const end = deletionWaitingPeriodEndsAt(start);
    expect(end.getTime() - start.getTime()).toBe(GYM_DELETION_WAITING_PERIOD_MS);
  });

  it("tracks scheduled pending state", () => {
    expect(
      hasPendingScheduledDeletion({ deletionMode: "scheduled", purgeStatus: "scheduled_pending" }),
    ).toBe(true);
    expect(initialPurgeStatusForMode("scheduled")).toBe("scheduled_pending");
    expect(initialPurgeStatusForMode("immediate")).toBe("backup_pending");
  });
});

describe("scheduled eligibility", () => {
  it("cannot purge before eligibility", () => {
    const eligibleAt = Timestamp.fromDate(new Date("2026-02-01T00:00:00.000Z"));
    const gym = {
      deletionMode: "scheduled" as const,
      deletionEligibleAt: eligibleAt,
      purgeStatus: "scheduled_pending" as const,
    };
    expect(isScheduledDeletionEligible(gym, new Date("2026-01-15T00:00:00.000Z"))).toBe(false);
    expect(isScheduledDeletionEligible(gym, new Date("2026-02-02T00:00:00.000Z"))).toBe(true);
  });
});

describe("immediate deletion confirmation", () => {
  it("requires exact gym name and id", () => {
    const bad = validateImmediateDeletionConfirmation({
      gymName: "Alpha Gym",
      gymId: "g-1",
      confirmName: "Alpha",
      confirmId: "g-1",
      confirmPhrase: IMMEDIATE_DELETION_CONFIRM_PHRASE,
    });
    expect(bad.ok).toBe(false);

    const good = validateImmediateDeletionConfirmation({
      gymName: "Alpha Gym",
      gymId: "g-1",
      confirmName: "Alpha Gym",
      confirmId: "g-1",
      confirmPhrase: IMMEDIATE_DELETION_CONFIRM_PHRASE,
    });
    expect(good.ok).toBe(true);
  });
});

describe("reactivation policy", () => {
  it("blocks immediate deletion and purge-ready gyms", () => {
    expect(
      canReactivateGym({
        status: "deactivated",
        deletionMode: "immediate",
        deletionLockedAt: Timestamp.now(),
        purgeStatus: "backup_pending",
      }).ok,
    ).toBe(false);

    expect(
      validateGymReactivateTransition(
        {
          status: "deactivated",
          deletionMode: "immediate",
          deletionLockedAt: Timestamp.now(),
          purgeStatus: "backup_pending",
        },
        "g1",
      ).ok,
    ).toBe(false);

    expect(
      canReactivateGym({
        status: "deactivated",
        deletionMode: "scheduled",
        deletionLockedAt: null,
        purgeStatus: "scheduled_pending",
      }).ok,
    ).toBe(true);
  });
});

describe("access and purge gates", () => {
  it("blocks tenant access when deactivated", () => {
    expect(gymAllowsTenantAccess({ status: "deactivated" })).toBe(false);
  });

  it("disables destructive purge by default", () => {
    const prev = process.env.ALLOW_TENANT_GYM_PURGE;
    delete process.env.ALLOW_TENANT_GYM_PURGE;
    expect(isTenantPurgeDestructionEnabled()).toBe(false);
    expect(() => assertTenantPurgeDestructionEnabled()).toThrow(GymPurgeDisabledError);
    if (prev === undefined) delete process.env.ALLOW_TENANT_GYM_PURGE;
    else process.env.ALLOW_TENANT_GYM_PURGE = prev;
  });
});

describe("purge runner", () => {
  const gymId = "gym-alpha";
  const inventory = {
    gymId,
    counts: { members: 2 },
    totalDocuments: 2,
  };

  const deps = {
    gymId,
    dryRun: true,
    inventory: async () => inventory,
    archiveFinancialRecords: vi.fn(),
    deleteFirestoreTenantBatch: vi.fn(),
    deleteSupabaseTenantPrefix: vi.fn(),
    deletePostgresTenant: vi.fn(),
    deleteGymRootDocuments: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("scopes inventory to gymId", () => {
    expect(() => assertInventoryScopedToGym(inventory, gymId)).not.toThrow();
    expect(() => assertInventoryScopedToGym({ ...inventory, gymId: "other" }, gymId)).toThrow();
  });

  it("never targets global catalogs", () => {
    expect(() => assertNeverDeleteCollectionsSafe()).not.toThrow();
  });

  it("restricts supabase prefix", () => {
    expect(gymSupabaseStoragePrefix("g1")).toBe("gyms/g1/");
  });

  it("completes dry-run purge idempotently", async () => {
    const start: GymPurgeProgress = { phase: "precheck", cursor: null, completedPhases: [] };
    const result = await runPurgeUntilIdle(start, deps, 80);
    expect(result.status).toBe("completed");
    expect(deps.archiveFinancialRecords).not.toHaveBeenCalled();
    expect(deps.deleteGymRootDocuments).not.toHaveBeenCalled();
  });

  it("resumes from mid-phase progress", async () => {
    const progress: GymPurgeProgress = {
      phase: "postgres_tenant",
      cursor: null,
      completedPhases: ["precheck", "financial_archive", "firestore_tenant", "supabase_storage"],
    };
    const step = await runPurgePhase(progress, deps);
    expect(step.status).toBe("advanced");
    expect(step.progress.phase).toBe("gym_root");
  });

  it("duplicate execution with same deps stays safe in dry-run", async () => {
    const start: GymPurgeProgress = { phase: "precheck", cursor: null, completedPhases: [] };
    const first = await runPurgeUntilIdle(start, deps, 80);
    const second = await runPurgeUntilIdle(first.progress, deps, 80);
    expect(second.status).toBe("completed");
  });
});