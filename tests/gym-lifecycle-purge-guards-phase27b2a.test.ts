import { beforeEach, describe, expect, it, vi } from "vitest";
import { Timestamp } from "firebase-admin/firestore";

import * as tenantWriteAudit from "@/lib/gym-lifecycle/tenant-write-audit";
import { evaluateFinancialArchiveCompleteness } from "@/lib/gym-lifecycle/financial-archive-verify";
import { evaluatePurgeAuthority } from "@/lib/gym-lifecycle/purge/purge-authority";
import {
  acquirePurgeJobLease,
  commitPurgeProgressWithLease,
} from "@/lib/gym-lifecycle/purge/purge-job-lease";
import type { GymDeletionJobDoc } from "@/lib/firestore/repositories/gym-deletion-jobs";
import type { GymFinancialArchiveDoc } from "@/lib/firestore/repositories/gym-financial-archives";
import type { GymDoc } from "@/lib/firestore/types";

const baseGym = (overrides: Partial<GymDoc> = {}): GymDoc & { id: string } => ({
  id: "g1",
  name: "Gym",
  slug: null,
  registrationToken: "tok",
  memberSeq: 0,
  receiptSeq: 0,
  status: "deactivated",
  deletionMode: "scheduled",
  deletionEligibleAt: Timestamp.fromDate(new Date("2020-01-01T00:00:00Z")),
  deletionLockedAt: null,
  purgeStatus: "ready",
  purgeJobId: "job-1",
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
  ...overrides,
});

const baseJob = (): GymDeletionJobDoc & { id: string } => ({
  id: "job-1",
  gymId: "g1",
  gymName: "Gym",
  deletionMode: "scheduled",
  purgeStatus: "ready",
  requestedByUserId: "admin",
  requestedAt: Timestamp.fromDate(new Date("2019-01-01")),
  eligibleAt: Timestamp.fromDate(new Date("2020-01-01")),
  lockedAt: null,
  backupArtifactRef: null,
  backupChecksum: null,
  purgeConfirmedAt: Timestamp.fromDate(new Date("2020-01-02")),
  purgeConfirmedByUserId: "admin",
  purgeLeaseOwner: null,
  purgeLeaseExpiresAt: null,
  progress: null,
  purgeError: null,
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
});

const baseArchive = (): GymFinancialArchiveDoc & { id: string } => ({
  id: "g1",
  gymId: "g1",
  gymName: "Gym",
  archivedAt: Timestamp.now(),
  retentionPolicyConfigured: true,
  financialArchiveStatus: "complete",
  financialArchiveVerifiedAt: Timestamp.now(),
  payments: [],
  receipts: [],
  ledgerTransactions: [],
  subscriptions: [],
  backupArtifactRef: null,
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
});

describe("purge authority", () => {
  beforeEach(() => {
    vi.spyOn(tenantWriteAudit, "evaluateTenantWriteCoverageForPurge").mockReturnValue({
      ok: true,
    });
  });

  it("rejects active gyms", () => {
    const result = evaluatePurgeAuthority({
      gym: baseGym({ status: "active" }),
      job: baseJob(),
      archive: baseArchive(),
      now: new Date("2021-01-01"),
    });
    expect(result.ok).toBe(false);
    expect(result.checks.gym_deactivated.ok).toBe(false);
  });

  it("rejects scheduled deletion before eligibleAt", () => {
    const result = evaluatePurgeAuthority({
      gym: baseGym(),
      job: baseJob(),
      archive: baseArchive(),
      now: new Date("2019-06-01"),
    });
    expect(result.checks.scheduled_eligibility.ok).toBe(false);
  });

  it("rejects immediate deletion mode", () => {
    const result = evaluatePurgeAuthority({
      gym: baseGym({ deletionMode: "immediate" }),
      job: { ...baseJob(), deletionMode: "immediate" },
      archive: baseArchive(),
      now: new Date("2021-01-01"),
    });
    expect(result.checks.no_immediate_bypass.ok).toBe(false);
  });

  it("does not require backup metadata", () => {
    const result = evaluatePurgeAuthority({
      gym: baseGym({ backupStatus: undefined, backupScope: null }),
      job: baseJob(),
      archive: baseArchive(),
      now: new Date("2021-01-01"),
    });
    expect(result.ok).toBe(true);
  });

  it("accepts authority with confirmation and elapsed waiting period", () => {
    const result = evaluatePurgeAuthority({
      gym: baseGym(),
      job: baseJob(),
      archive: baseArchive(),
      now: new Date("2021-01-01"),
    });
    expect(result.ok).toBe(true);
  });

  it("rejects incomplete financial archive", () => {
    const incomplete = evaluateFinancialArchiveCompleteness(null);
    expect(incomplete.ok).toBe(false);
  });
});

describe("purge job lease", () => {
  it("prevents two workers from holding the same lease", async () => {
    const db = {
      collection: () => ({
        doc: () => ({
          get: async () => ({
            exists: true,
            data: () => ({
              purgeLeaseOwner: "other",
              purgeLeaseExpiresAt: Timestamp.fromMillis(Date.now() + 60_000),
            }),
          }),
          update: async () => {},
        }),
      }),
      runTransaction: async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          get: async () => ({
            exists: true,
            data: () => ({
              purgeLeaseOwner: "other",
              purgeLeaseExpiresAt: Timestamp.fromMillis(Date.now() + 60_000),
            }),
          }),
          update: () => {},
        }),
    };
    const lease = await acquirePurgeJobLease(
      db as never,
      "job-1",
      "worker-a",
      Date.now(),
    );
    expect(lease.acquired).toBe(false);
  });

  it("does not advance cursor when batch fails", async () => {
    const result = await commitPurgeProgressWithLease(
      { runTransaction: async () => {} } as never,
      {
        jobId: "j1",
        leaseOwner: "w",
        expected: { phase: "firestore_tenant", cursor: "c1" },
        next: { phase: "firestore_tenant", cursor: "c2" },
        batchSucceeded: false,
      },
    );
    expect(result.committed).toBe(false);
  });
});