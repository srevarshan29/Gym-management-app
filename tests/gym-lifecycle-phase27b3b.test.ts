import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { Timestamp } from "firebase-admin/firestore";

import { InMemoryBackupStorage } from "@/lib/gym-lifecycle/backup/backup-storage";
import {
  createSharedExportDownloadTokenMemory,
  MemoryExportDownloadTokenStore,
  setExportDownloadTokenStoreForTests,
} from "@/lib/gym-lifecycle/export/export-download-token-store";
import { setExportRateLimitMemoryModeForTests } from "@/lib/gym-lifecycle/export/export-rate-limit";
import { buildGymDataExportZip } from "@/lib/gym-lifecycle/export/gym-data-export-archive";
import {
  evaluateGymExportReadyForDownload,
  redeemAndLoadGymExportArtifact,
} from "@/lib/gym-lifecycle/export/gym-data-export-download";
import { storagePathToZipEntryPath } from "@/lib/gym-lifecycle/export/export-filename";
import { runOptionalGymDataExport } from "@/lib/gym-lifecycle/export/gym-data-export";
import { evaluatePurgeAuthority } from "@/lib/gym-lifecycle/purge/purge-authority";
import * as tenantWriteAudit from "@/lib/gym-lifecycle/tenant-write-audit";
import { vi } from "vitest";
import * as firestoreModule from "@/lib/firestore";

function baseGym(overrides: Record<string, unknown> = {}) {
  return {
    id: "g1",
    name: "Gym",
    slug: null,
    registrationToken: "t",
    memberSeq: 0,
    receiptSeq: 0,
    status: "deactivated" as const,
    deletionMode: "scheduled" as const,
    dataExportStatus: "ready" as const,
    dataExportId: "exp-1",
    dataExportArtifactRef: "gym-exports/g1/exp-1.zip",
    dataExportChecksum: "aa".repeat(32),
    dataExportDownloadExpiresAt: Timestamp.fromDate(new Date("2099-01-01")),
    dataExportComplete: true,
    purgeStatus: "scheduled_pending" as const,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    ...overrides,
  };
}

describe("export zip and manifest", () => {
  it("includes manifest and sanitized data files", async () => {
    const archive = await buildGymDataExportZip({
      gymId: "g-zip",
      exportId: "e1",
      bundle: {
        formatVersion: 1,
        gymId: "g-zip",
        exportedAt: new Date().toISOString(),
        inventory: { gymId: "g-zip", counts: { members: 1 }, totalDocuments: 1 },
        gym: { id: "g-zip", name: "G" },
        firestore: { members: [{ gymId: "g-zip", name: "M" }] },
        financial: {
          payments: [],
          receipts: [],
          ledgerTransactions: [],
          subscriptions: [],
        },
      },
      storageLister: null,
    });
    expect(archive.manifest.complete).toBe(true);
    expect(archive.manifest.categories.storageAssets.status).toBe("skipped");
    expect(archive.zipBody.subarray(0, 2).toString("utf8")).toBe("PK");
  });

  it("rejects path traversal in asset zip paths", () => {
    expect(() => storagePathToZipEntryPath("g1", "gyms/other/file.png")).toThrow();
    expect(() => storagePathToZipEntryPath("g1", "gyms/g1/../evil")).toThrow();
  });
});

describe("Firestore-backed download tokens (shared memory)", () => {
  const shared = createSharedExportDownloadTokenMemory();
  const storeA = new MemoryExportDownloadTokenStore(shared);
  const storeB = new MemoryExportDownloadTokenStore(shared);

  beforeEach(() => {
    shared.docs.clear();
    setExportDownloadTokenStoreForTests(storeA);
    setExportRateLimitMemoryModeForTests(true);
  });

  afterEach(() => {
    setExportDownloadTokenStoreForTests(null);
    setExportRateLimitMemoryModeForTests(false);
  });

  it("allows redeem from a second store instance (serverless simulation)", async () => {
    const issued = await storeA.issue({
      gymId: "g1",
      exportId: "exp-1",
      artifactPath: "gym-exports/g1/exp-1.zip",
      checksumSha256: "cc".repeat(32),
      issuedToUserId: "admin-1",
    });
    const redeemed = await storeB.redeem({
      bearerToken: issued.bearerToken,
      gymId: "g1",
      exportId: "exp-1",
      superAdminUserId: "admin-1",
    });
    expect(redeemed.ok).toBe(true);
  });

  it("rejects reused token", async () => {
    const issued = await storeA.issue({
      gymId: "g1",
      exportId: "exp-1",
      artifactPath: "path",
      checksumSha256: "dd".repeat(32),
      issuedToUserId: "admin-1",
    });
    const first = await storeA.redeem({
      bearerToken: issued.bearerToken,
      gymId: "g1",
      exportId: "exp-1",
      superAdminUserId: "admin-1",
    });
    expect(first.ok).toBe(true);
    const second = await storeB.redeem({
      bearerToken: issued.bearerToken,
      gymId: "g1",
      exportId: "exp-1",
      superAdminUserId: "admin-1",
    });
    expect(second.ok).toBe(false);
  });

  it("rejects cross-gym and wrong admin", async () => {
    const issued = await storeA.issue({
      gymId: "g1",
      exportId: "exp-1",
      artifactPath: "path",
      checksumSha256: "ee".repeat(32),
      issuedToUserId: "admin-1",
    });
    const wrongGym = await storeA.redeem({
      bearerToken: issued.bearerToken,
      gymId: "g2",
      exportId: "exp-1",
      superAdminUserId: "admin-1",
    });
    expect(wrongGym.ok).toBe(false);
    const wrongAdmin = await storeA.redeem({
      bearerToken: issued.bearerToken,
      gymId: "g1",
      exportId: "exp-1",
      superAdminUserId: "admin-2",
    });
    expect(wrongAdmin.ok).toBe(false);
  });

  it("rejects expired download bearer token", async () => {
    const issued = await storeA.issue({
      gymId: "g1",
      exportId: "exp-1",
      artifactPath: "path",
      checksumSha256: "ff".repeat(32),
      issuedToUserId: "admin-1",
      now: new Date("2020-01-01T00:00:00Z"),
    });
    const redeemed = await storeA.redeem({
      bearerToken: issued.bearerToken,
      gymId: "g1",
      exportId: "exp-1",
      superAdminUserId: "admin-1",
      now: new Date("2020-01-01T01:00:00Z"),
    });
    expect(redeemed.ok).toBe(false);
  });

  it("rejects expired artifact window", () => {
    const result = evaluateGymExportReadyForDownload(
      baseGym({
        dataExportDownloadExpiresAt: Timestamp.fromDate(new Date("2020-01-01")),
      }),
      new Date("2021-01-01"),
    );
    expect(result.ok).toBe(false);
  });
});

describe("artifact download integrity", () => {
  const shared = createSharedExportDownloadTokenMemory();
  let storage: InMemoryBackupStorage;

  beforeEach(() => {
    storage = new InMemoryBackupStorage();
    shared.docs.clear();
    setExportDownloadTokenStoreForTests(new MemoryExportDownloadTokenStore(shared));
    setExportRateLimitMemoryModeForTests(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockGymLookup(checksum: string) {
    vi.spyOn(firestoreModule, "getRepositories").mockReturnValue({
      gyms: {
        getById: async () => baseGym({ dataExportChecksum: checksum }) as never,
      },
    } as never);
  }

  it("loads artifact after redeem and verifies checksum", async () => {
    const body = Buffer.from("zip-bytes");
    const { sha256Hex } = await import("@/lib/gym-lifecycle/backup/checksum");
    const checksum = sha256Hex(body);
    await storage.upload({
      objectPath: "gym-exports/g1/exp-1.zip",
      body,
      contentType: "application/zip",
    });
    const store = new MemoryExportDownloadTokenStore(shared);
    const issued = await store.issue({
      gymId: "g1",
      exportId: "exp-1",
      artifactPath: "gym-exports/g1/exp-1.zip",
      checksumSha256: checksum,
      issuedToUserId: "admin-1",
    });

    mockGymLookup(checksum);

    const redeemed = await redeemAndLoadGymExportArtifact({
      gymId: "g1",
      exportId: "exp-1",
      bearerToken: issued.bearerToken,
      superAdminUserId: "admin-1",
      storage,
    });
    expect(redeemed.ok).toBe(true);
    if (redeemed.ok) {
      expect(redeemed.body.toString()).toBe("zip-bytes");
    }
  });

  it("rejects corrupted artifact checksum", async () => {
    const body = Buffer.from("zip-bytes");
    const { sha256Hex } = await import("@/lib/gym-lifecycle/backup/checksum");
    const checksum = sha256Hex(body);
    await storage.upload({
      objectPath: "gym-exports/g1/exp-1.zip",
      body: Buffer.from("tampered"),
      contentType: "application/zip",
    });
    const store = new MemoryExportDownloadTokenStore(shared);
    const issued = await store.issue({
      gymId: "g1",
      exportId: "exp-1",
      artifactPath: "gym-exports/g1/exp-1.zip",
      checksumSha256: checksum,
      issuedToUserId: "admin-1",
    });
    mockGymLookup(checksum);
    const redeemed = await redeemAndLoadGymExportArtifact({
      gymId: "g1",
      exportId: "exp-1",
      bearerToken: issued.bearerToken,
      superAdminUserId: "admin-1",
      storage,
    });
    expect(redeemed.ok).toBe(false);
  });
});

describe("purge without export", () => {
  beforeEach(() => {
    vi.spyOn(tenantWriteAudit, "evaluateTenantWriteCoverageForPurge").mockReturnValue({
      ok: true,
    });
  });

  it("does not require export before purge authority", () => {
    const result = evaluatePurgeAuthority({
      gym: baseGym({
        purgeStatus: "ready",
        purgeJobId: "j1",
        deletionEligibleAt: Timestamp.fromDate(new Date("2029-01-01")),
        dataExportStatus: "failed",
      }),
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
      now: new Date("2030-01-01"),
    });
    expect(result.ok).toBe(true);
  });
});

describe("runOptionalGymDataExport bounded writer", () => {
  it("writes zip artifact with mock bundle", async () => {
    const written: Array<{ path: string; bytes: number }> = [];
    const result = await runOptionalGymDataExport({
      gymId: "g-w",
      exportId: "ex-w",
      buildBundle: async () => ({
        formatVersion: 1,
        gymId: "g-w",
        exportedAt: new Date().toISOString(),
        inventory: { gymId: "g-w", counts: {}, totalDocuments: 0 },
        gym: { id: "g-w", name: "W" },
        firestore: {},
        financial: { payments: [], receipts: [], ledgerTransactions: [], subscriptions: [] },
      }),
      storageLister: null,
      writer: {
        async write(path, body) {
          written.push({ path, bytes: body.byteLength });
        },
      },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(written[0]?.path).toContain(".zip");
      expect(written[0]?.bytes).toBeGreaterThan(0);
    }
  });
});