import { describe, expect, it, beforeEach, vi } from "vitest";
import { Timestamp } from "firebase-admin/firestore";

import * as tenantWriteAudit from "@/lib/gym-lifecycle/tenant-write-audit";
import { sanitizeRecordForExport } from "@/lib/gym-lifecycle/export/export-sanitize";
import { runOptionalGymDataExport } from "@/lib/gym-lifecycle/export/gym-data-export";
import {
  deletionWaitingPeriodEndsAt,
  isScheduledDeletionEligible,
} from "@/lib/gym-lifecycle/deletion-policy";
import { evaluatePurgeAuthority } from "@/lib/gym-lifecycle/purge/purge-authority";
import { validateImmediateDeletionConfirmation } from "@/lib/gym-lifecycle/gym-deletion-confirm";

describe("scheduled deletion policy", () => {
  it("requires 30 days before eligibility", () => {
    const requested = new Date("2026-01-01T00:00:00Z");
    const eligible = deletionWaitingPeriodEndsAt(requested);
    expect(eligible.getTime() - requested.getTime()).toBe(30 * 24 * 60 * 60 * 1000);
    expect(
      isScheduledDeletionEligible(
        {
          deletionMode: "scheduled",
          deletionEligibleAt: Timestamp.fromDate(eligible),
          purgeStatus: "scheduled_pending",
        },
        new Date("2026-01-15"),
      ),
    ).toBe(false);
    expect(
      isScheduledDeletionEligible(
        {
          deletionMode: "scheduled",
          deletionEligibleAt: Timestamp.fromDate(eligible),
          purgeStatus: "scheduled_pending",
        },
        eligible,
      ),
    ).toBe(true);
  });
});

describe("optional export", () => {
  it("fails when export flag is off", async () => {
    const prev = process.env.ALLOW_TENANT_GYM_DATA_EXPORT;
    delete process.env.ALLOW_TENANT_GYM_DATA_EXPORT;
    const result = await runOptionalGymDataExport({ gymId: "g1" });
    expect(result.ok).toBe(false);
    if (prev) process.env.ALLOW_TENANT_GYM_DATA_EXPORT = prev;
  });

  it("succeeds with in-memory writer when bundle is mocked", async () => {
    const written: string[] = [];
    const result = await runOptionalGymDataExport({
      gymId: "g-export",
      buildBundle: async () => ({
        formatVersion: 1,
        gymId: "g-export",
        exportedAt: new Date().toISOString(),
        inventory: { gymId: "g-export", counts: {}, totalDocuments: 0 },
        gym: { id: "g-export", name: "G" },
        firestore: {},
        financial: { payments: [], receipts: [], ledgerTransactions: [], subscriptions: [] },
      }),
      writer: {
        async write(path, _body) {
          written.push(path);
        },
      },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(written[0]).toContain("g-export");
      expect(written[0]).toContain(".zip");
      expect(result.exportId).toBeTruthy();
    }
  });

  it("redacts secrets from exported records", () => {
    const sanitized = sanitizeRecordForExport({
      name: "Member",
      passwordHash: "secret",
      gymId: "g1",
    });
    expect(sanitized.passwordHash).toBe("[REDACTED]");
    expect(sanitized.gymId).toBe("g1");
  });
});

describe("purge without export", () => {
  beforeEach(() => {
    vi.spyOn(tenantWriteAudit, "evaluateTenantWriteCoverageForPurge").mockReturnValue({
      ok: true,
    });
  });

  it("allows purge confirmation path without backup fields", () => {
    const now = new Date("2030-01-01");
    const result = evaluatePurgeAuthority({
      gym: {
        id: "g1",
        name: "Gym",
        slug: null,
        registrationToken: "t",
        memberSeq: 0,
        receiptSeq: 0,
        status: "deactivated",
        deletionMode: "scheduled",
        deletionEligibleAt: Timestamp.fromDate(new Date("2029-01-01")),
        purgeStatus: "ready",
        purgeJobId: "j1",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      job: {
        id: "j1",
        gymId: "g1",
        gymName: "Gym",
        deletionMode: "scheduled",
        purgeStatus: "ready",
        requestedByUserId: "a",
        requestedAt: Timestamp.fromDate(new Date("2028-01-01")),
        eligibleAt: Timestamp.fromDate(new Date("2029-01-01")),
        lockedAt: null,
        backupArtifactRef: null,
        backupChecksum: null,
        purgeConfirmedAt: Timestamp.fromDate(new Date("2029-02-01")),
        purgeConfirmedByUserId: "a",
        purgeLeaseOwner: null,
        purgeLeaseExpiresAt: null,
        progress: null,
        purgeError: null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      archive: {
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
      },
      now,
    });
    expect(result.ok).toBe(true);
  });
});

describe("final confirmation validation", () => {
  it("rejects gym name mismatch", () => {
    const result = validateImmediateDeletionConfirmation({
      gymName: "Alpha Gym",
      gymId: "g1",
      confirmName: "Wrong",
      confirmId: "g1",
      confirmPhrase: "DELETE GYM PERMANENTLY",
    });
    expect(result.ok).toBe(false);
  });
});