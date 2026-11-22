import { Timestamp } from "firebase-admin/firestore";

import { backupObjectPrefix, type TenantBackupManifestV1 } from "@/lib/gym-lifecycle/backup/backup-format";
import type { BackupStorageAdapter } from "@/lib/gym-lifecycle/backup/backup-storage";
import { sha256Hex } from "@/lib/gym-lifecycle/backup/checksum";
import {
  exportFirestoreCollectionPage,
  exportGymRootDocuments,
} from "@/lib/gym-lifecycle/backup/firestore-tenant-export";
import {
  buildTenantFirestoreInventoryCounts,
  mergeManifestInventoryCounts,
  validateFirestoreExportMatchesLiveInventory,
} from "@/lib/gym-lifecycle/backup/firestore-backup-inventory";
import { verifyFirestoreBackupDocumentIntegrity } from "@/lib/gym-lifecycle/backup/firestore-backup-integrity";
import { verifyPostgresBackupIntegrity } from "@/lib/gym-lifecycle/backup/postgres-backup-integrity";
import { verifySupabaseStorageContentIntegrity } from "@/lib/gym-lifecycle/backup/supabase-backup-integrity";
import type { PostgresExportAdapter } from "@/lib/gym-lifecycle/backup/postgres-tenant-export";
import { exportSinglePostgresTableForTenant } from "@/lib/gym-lifecycle/backup/postgres-tenant-export";
import { loadFullBackupVerificationBodies } from "@/lib/gym-lifecycle/backup/backup-purge-verification";
import {
  buildTenantBackupEvidenceBinding,
  expectedPostgresExportTableNames,
  validateTenantBackupSourceEvidence,
  type TenantBackupSourceEvidenceV1,
} from "@/lib/gym-lifecycle/backup/backup-source-evidence";
import {
  exportSupabaseObject,
  listAllTenantStorageObjects,
  type SupabaseStorageLister,
} from "@/lib/gym-lifecycle/backup/supabase-tenant-export";
import {
  TENANT_FINANCIAL_COLLECTIONS,
  TENANT_GYM_ID_COLLECTIONS,
} from "@/lib/gym-lifecycle/backup/tenant-data-inventory";
import {
  createIsolatedRestoreTarget,
  restoreIntoIsolatedTarget,
  validateRestoredCounts,
} from "@/lib/gym-lifecycle/backup/tenant-backup-restore-validator";
import {
  finalizeManifestChecksum,
  verifyTenantBackupManifest,
} from "@/lib/gym-lifecycle/backup/tenant-backup-verify";
import { buildVerifiedFinancialArchivePayload } from "@/lib/gym-lifecycle/financial-archive-verify";
import { resolveGymLifecycleStatus } from "@/lib/gym-lifecycle/status";
import type { GymTenantBackupJobDoc } from "@/lib/firestore/repositories/gym-tenant-backup-jobs";
import type { Firestore } from "firebase-admin/firestore";

const BACKUP_LEASE_MS = 10 * 60 * 1000;

export type TenantBackupRunnerDeps = {
  db: Firestore;
  storage: BackupStorageAdapter;
  postgres: PostgresExportAdapter;
  supabase: SupabaseStorageLister;
  gymName: string;
  gymId: string;
  deletionJobId: string | null;
  backupId: string;
  jobId: string;
  actorUserId: string;
  allowProductionIO?: boolean;
};

export type TenantBackupStepResult =
  | { status: "advanced"; phase: GymTenantBackupJobDoc["phase"] }
  | { status: "completed"; manifestChecksumSha256: string }
  | { status: "failed"; error: string };

async function acquireBackupLease(
  db: Firestore,
  jobId: string,
  owner: string,
  collection: string,
): Promise<void> {
  const ref = db.collection(collection).doc(jobId);
  const now = Date.now();
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error("Backup job not found.");
    const data = snap.data() as GymTenantBackupJobDoc;
    const expires = data.leaseExpiresAt?.toMillis() ?? 0;
    if (data.leaseOwner && data.leaseOwner !== owner && expires > now) {
      throw new Error("Another worker holds the backup lease.");
    }
    tx.update(ref, {
      leaseOwner: owner,
      leaseExpiresAt: Timestamp.fromMillis(now + BACKUP_LEASE_MS),
      updatedAt: Timestamp.now(),
    });
  });
}

function firestoreDocCountFromInventory(inventory: Record<string, number>): number {
  return Object.entries(inventory)
    .filter(([key]) => key.startsWith("firestore:"))
    .reduce((sum, [, count]) => sum + count, 0);
}

function artifactPath(prefix: string, suffix: string): string {
  return `${prefix}${suffix}`;
}

export async function advanceTenantFullBackupStep(
  job: GymTenantBackupJobDoc & { id: string },
  deps: TenantBackupRunnerDeps,
): Promise<TenantBackupStepResult> {
  if (!deps.allowProductionIO) {
    return {
      status: "failed",
      error:
        "Full tenant backup requires explicit test/mocks or ALLOW_TENANT_FULL_BACKUP_EXPORT.",
    };
  }

  const gymSnap = await deps.db.collection("gyms").doc(deps.gymId).get();
  if (!gymSnap.exists) {
    return { status: "failed", error: "Gym not found." };
  }
  const gym = gymSnap.data() as { status?: import("@/lib/firestore/types").GymLifecycleStatus };
  if (resolveGymLifecycleStatus(gym) !== "deactivated") {
    return { status: "failed", error: "Gym must remain deactivated during full backup." };
  }

  const collection = "gymTenantBackupJobs";
  await acquireBackupLease(deps.db, deps.jobId, deps.actorUserId, collection);

  const prefix = backupObjectPrefix(deps.gymId, deps.backupId);
  const progress = (job.progress ?? {}) as Record<string, string | number | null>;
  const artifacts = [...(job.artifacts ?? [])];

  try {
    if (job.phase === "inventory") {
      const inventoryCounts = await buildTenantFirestoreInventoryCounts(deps.db, deps.gymId);
      const roots = await exportGymRootDocuments(deps.db, deps.gymId);
      const rootPath = artifactPath(prefix, "firestore/gym-roots.json");
      const rootBody = Buffer.from(JSON.stringify(roots), "utf8");
      const rootUpload = await deps.storage.upload({
        objectPath: rootPath,
        body: rootBody,
        contentType: "application/json",
      });
      artifacts.push({
        path: rootUpload.path,
        checksumSha256: rootUpload.checksumSha256,
        sizeBytes: rootUpload.sizeBytes,
        recordCount: roots.length,
        contentType: "application/json",
      });
      inventoryCounts["firestore:gym-roots"] = roots.length;
      await patchJob(deps, job.id, {
        phase: "firestore",
        inventoryCounts,
        artifacts,
        progress: { collection: TENANT_GYM_ID_COLLECTIONS[0] ?? null, cursor: null },
      });
      return { status: "advanced", phase: "firestore" };
    }

    if (job.phase === "firestore") {
      const collectionName = String(progress.collection ?? TENANT_GYM_ID_COLLECTIONS[0]);
      const cursor = (progress.cursor as string | null) ?? null;
      const { docs, nextCursor } = await exportFirestoreCollectionPage(
        deps.db,
        deps.gymId,
        collectionName,
        cursor,
      );
      if (docs.length > 0) {
        const shardPath = artifactPath(
          prefix,
          `firestore/${collectionName}/${cursor ?? "start"}-${docs[docs.length - 1]!.id}.json`,
        );
        const body = Buffer.from(JSON.stringify(docs), "utf8");
        const uploaded = await deps.storage.upload({ objectPath: shardPath, body, contentType: "application/json" });
        artifacts.push({
          path: uploaded.path,
          checksumSha256: uploaded.checksumSha256,
          sizeBytes: uploaded.sizeBytes,
          recordCount: docs.length,
          contentType: "application/json",
        });
      }
      if (nextCursor) {
        await patchJob(deps, job.id, {
          artifacts,
          progress: { collection: collectionName, cursor: nextCursor },
        });
        return { status: "advanced", phase: "firestore" };
      }
      const idx = TENANT_GYM_ID_COLLECTIONS.indexOf(collectionName);
      const nextCollection = TENANT_GYM_ID_COLLECTIONS[idx + 1];
      if (nextCollection) {
        await patchJob(deps, job.id, {
          artifacts,
          progress: { collection: nextCollection, cursor: null },
        });
        return { status: "advanced", phase: "firestore" };
      }
      const inventory = job.inventoryCounts ?? {};
      const firestoreEvidence: TenantBackupSourceEvidenceV1["firestore"] = {
        status: "complete",
        inspectedAt: new Date().toISOString(),
        recordCount: firestoreDocCountFromInventory(inventory),
        collectionsScanned: TENANT_GYM_ID_COLLECTIONS.length,
        rootDocCount: inventory["firestore:gym-roots"] ?? 0,
        shardArtifactCount: artifacts.filter((a) => a.path.includes("/firestore/")).length,
      };
      await patchJob(deps, job.id, {
        phase: "supabase",
        artifacts,
        progress: { storageIndex: 0 },
        sourceEvidence: {
          ...(job.sourceEvidence ?? {}),
          firestore: firestoreEvidence,
        },
      });
      return { status: "advanced", phase: "supabase" };
    }

    if (job.phase === "supabase") {
      const allPaths =
        (Array.isArray(progress.allPaths) ? (progress.allPaths as string[]) : undefined) ??
        (await listAllTenantStorageObjects(deps.supabase, deps.gymId));
      const index = Number(progress.storageIndex ?? 0);
      const path = allPaths[index];
      if (path) {
        const meta = await exportSupabaseObject(deps.supabase, path);
        const bytes = await deps.supabase.download(path);
        const objPath = artifactPath(prefix, `storage/objects/${index}-${sha256Hex(path).slice(0, 12)}.bin`);
        const uploaded = await deps.storage.upload({
          objectPath: objPath,
          body: bytes,
          contentType: meta.contentType ?? "application/octet-stream",
        });
        artifacts.push({
          path: uploaded.path,
          checksumSha256: uploaded.checksumSha256,
          sizeBytes: uploaded.sizeBytes,
          recordCount: 1,
          contentType: meta.contentType ?? "application/octet-stream",
        });
        await patchJob(deps, job.id, {
          artifacts,
          progress: { allPaths, storageIndex: index + 1 },
        });
        return { status: "advanced", phase: "supabase" };
      }
      const manifestPath = artifactPath(prefix, "storage/paths.json");
      const manifestBody = Buffer.from(JSON.stringify(allPaths), "utf8");
      const uploaded = await deps.storage.upload({
        objectPath: manifestPath,
        body: manifestBody,
        contentType: "application/json",
      });
      artifacts.push({
        path: uploaded.path,
        checksumSha256: uploaded.checksumSha256,
        sizeBytes: uploaded.sizeBytes,
        recordCount: allPaths.length,
        contentType: "application/json",
      });
      const objectByteArtifacts = artifacts.filter((a) =>
        a.path.includes("/storage/objects/"),
      ).length;
      const supabaseEvidence: TenantBackupSourceEvidenceV1["supabase"] = {
        status: "complete",
        inspectedAt: new Date().toISOString(),
        recordCount: allPaths.length,
        pathsManifestPath: uploaded.path,
        pathsManifestChecksumSha256: uploaded.checksumSha256,
        objectByteArtifacts,
      };
      const inventoryPatch = {
        ...(job.inventoryCounts ?? {}),
        "storage:objects": allPaths.length,
      };
      await patchJob(deps, job.id, {
        phase: "postgres",
        artifacts,
        progress: { tableIndex: 0 },
        inventoryCounts: inventoryPatch,
        sourceEvidence: {
          ...(job.sourceEvidence ?? {}),
          supabase: supabaseEvidence,
        },
      });
      return { status: "advanced", phase: "postgres" };
    }

    if (job.phase === "postgres") {
      const postgresTableNames = expectedPostgresExportTableNames();
      const tableIndex = Number(progress.tableIndex ?? 0);
      const tableName = postgresTableNames[tableIndex];
      if (tableName) {
        const table = await exportSinglePostgresTableForTenant(
          deps.postgres,
          deps.gymId,
          tableName,
        );
        const body = Buffer.from(JSON.stringify(table), "utf8");
        const path = artifactPath(prefix, `postgres/${table.table}.json`);
        const uploaded = await deps.storage.upload({
          objectPath: path,
          body,
          contentType: "application/json",
        });
        artifacts.push({
          path: uploaded.path,
          checksumSha256: uploaded.checksumSha256,
          sizeBytes: uploaded.sizeBytes,
          recordCount: table.rowCount,
          contentType: "application/json",
        });
        await patchJob(deps, job.id, {
          artifacts,
          progress: { tableIndex: tableIndex + 1 },
        });
        return { status: "advanced", phase: "postgres" };
      }
      const postgresArtifacts = artifacts.filter((a) => a.path.includes("/postgres/"));
      const postgresRowSum = postgresArtifacts.reduce((s, a) => s + a.recordCount, 0);
      const postgresTableNamesDone = expectedPostgresExportTableNames();
      const postgresEvidence: TenantBackupSourceEvidenceV1["postgres"] = {
        status: "complete",
        inspectedAt: new Date().toISOString(),
        recordCount: postgresRowSum,
        tablesExported: postgresTableNamesDone.length,
        expectedTables: postgresTableNamesDone.length,
      };
      const postgresInventory: Record<string, number> = {
        ...(job.inventoryCounts ?? {}),
      };
      for (const artifact of postgresArtifacts) {
        const match = artifact.path.match(/\/postgres\/([^/]+)\.json$/);
        if (match?.[1]) {
          postgresInventory[`postgres:${match[1]}`] = artifact.recordCount;
        }
      }
      await patchJob(deps, job.id, {
        phase: "financial",
        artifacts,
        progress: null,
        inventoryCounts: postgresInventory,
        sourceEvidence: {
          ...(job.sourceEvidence ?? {}),
          postgres: postgresEvidence,
        },
      });
      return { status: "advanced", phase: "financial" };
    }

    if (job.phase === "financial") {
      const payload = await buildVerifiedFinancialArchivePayload(deps.db, deps.gymId);
      const body = Buffer.from(JSON.stringify(payload), "utf8");
      const path = artifactPath(prefix, "financial/archive.json");
      const uploaded = await deps.storage.upload({
        objectPath: path,
        body,
        contentType: "application/json",
      });
      const financialRecordCount =
        payload.payments.length +
        payload.receipts.length +
        payload.ledgerTransactions.length +
        payload.subscriptions.length;
      artifacts.push({
        path: uploaded.path,
        checksumSha256: uploaded.checksumSha256,
        sizeBytes: uploaded.sizeBytes,
        recordCount: financialRecordCount,
        contentType: "application/json",
      });
      const financialEvidence: TenantBackupSourceEvidenceV1["financial"] = {
        status: "complete",
        inspectedAt: new Date().toISOString(),
        recordCount: financialRecordCount,
        archivePath: uploaded.path,
      };
      await patchJob(deps, job.id, {
        phase: "manifest",
        artifacts,
        progress: null,
        sourceEvidence: {
          ...(job.sourceEvidence ?? {}),
          financial: financialEvidence,
        },
      });
      return { status: "advanced", phase: "manifest" };
    }

    if (job.phase === "manifest") {
      const liveFirestore = await buildTenantFirestoreInventoryCounts(deps.db, deps.gymId);
      const liveRoots = await exportGymRootDocuments(deps.db, deps.gymId);
      liveFirestore["firestore:gym-roots"] = liveRoots.length;

      const firestoreInventoryCheck = validateFirestoreExportMatchesLiveInventory({
        artifacts,
        liveInventory: liveFirestore,
        priorInventory: job.inventoryCounts ?? {},
      });
      if (!firestoreInventoryCheck.ok) {
        await patchJob(deps, job.id, {
          phase: "failed",
          lastError: firestoreInventoryCheck.reason,
        });
        return { status: "failed", error: firestoreInventoryCheck.reason };
      }

      const firestoreIntegrity = await verifyFirestoreBackupDocumentIntegrity({
        db: deps.db,
        storage: deps.storage,
        gymId: deps.gymId,
        artifacts,
      });
      if (!firestoreIntegrity.ok) {
        await patchJob(deps, job.id, {
          phase: "failed",
          lastError: firestoreIntegrity.reason,
        });
        return { status: "failed", error: firestoreIntegrity.reason };
      }

      const pathsArtifact = artifacts.find((a) => a.path.endsWith("/storage/paths.json"));
      if (!pathsArtifact) {
        const err = "Supabase paths manifest artifact is missing before manifest.";
        await patchJob(deps, job.id, { phase: "failed", lastError: err });
        return { status: "failed", error: err };
      }
      const pathsManifestBody = await deps.storage.download(pathsArtifact.path);
      const supabaseIntegrity = await verifySupabaseStorageContentIntegrity({
        lister: deps.supabase,
        storage: deps.storage,
        gymId: deps.gymId,
        pathsManifestBody,
        artifacts,
      });
      if (!supabaseIntegrity.ok) {
        await patchJob(deps, job.id, {
          phase: "failed",
          lastError: supabaseIntegrity.reason,
        });
        return { status: "failed", error: supabaseIntegrity.reason };
      }

      const postgresIntegrity = await verifyPostgresBackupIntegrity({
        adapter: deps.postgres,
        storage: deps.storage,
        gymId: deps.gymId,
        artifacts,
      });
      if (!postgresIntegrity.ok) {
        await patchJob(deps, job.id, {
          phase: "failed",
          lastError: postgresIntegrity.reason,
        });
        return { status: "failed", error: postgresIntegrity.reason };
      }

      const integrityVerifiedAt = new Date().toISOString();
      const sourceEvidence: TenantBackupSourceEvidenceV1 = {
        ...(job.sourceEvidence as TenantBackupSourceEvidenceV1),
        firestore: {
          ...job.sourceEvidence!.firestore!,
          documentIntegrityVerified: true,
          documentFingerprintCount: firestoreIntegrity.documentCount,
          integrityVerifiedAt,
        },
        postgres: {
          ...job.sourceEvidence!.postgres!,
          integrityVerified: true,
          integrityVerifiedAt,
        },
        supabase: {
          ...job.sourceEvidence!.supabase!,
          integrityVerified: true,
          integrityVerifiedAt,
        },
      };
      await patchJob(deps, job.id, { sourceEvidence });

      const manifestInventory = mergeManifestInventoryCounts({
        liveFirestore,
        existing: job.inventoryCounts ?? {},
      });

      const manifest: TenantBackupManifestV1 = {
        formatVersion: 1,
        backupId: deps.backupId,
        gymId: deps.gymId,
        deletionJobId: deps.deletionJobId,
        gymName: deps.gymName,
        createdAt: job.createdAt.toDate().toISOString(),
        completedAt: new Date().toISOString(),
        inventoryCounts: manifestInventory,
        artifacts,
        manifestChecksumSha256: null,
        firestoreIntegrity: {
          fingerprintAlgorithm: "sha256-canonical-v1",
          documentCount: firestoreIntegrity.documentCount,
          verifiedAt: firestoreIntegrity.verifiedAt,
        },
      };
      const manifestChecksumSha256 = finalizeManifestChecksum(manifest);
      manifest.manifestChecksumSha256 = manifestChecksumSha256;
      const manifestPath = artifactPath(prefix, "manifest.json");
      const body = Buffer.from(JSON.stringify(manifest), "utf8");
      await deps.storage.upload({ objectPath: manifestPath, body, contentType: "application/json" });
      await patchJob(deps, job.id, {
        phase: "verify",
        manifestChecksumSha256,
        inventoryCounts: manifestInventory,
        sourceEvidence,
        artifacts: [
          ...artifacts,
          {
            path: manifestPath,
            checksumSha256: sha256Hex(body),
            sizeBytes: body.byteLength,
            recordCount: artifacts.length,
            contentType: "application/json",
          },
        ],
      });
      return { status: "advanced", phase: "verify" };
    }

    if (job.phase === "verify") {
      const manifestPath = artifactPath(prefix, "manifest.json");
      const verify = await verifyTenantBackupManifest(
        deps.storage,
        manifestPath,
        job.inventoryCounts ?? {},
      );
      if (!verify.ok) {
        await patchJob(deps, job.id, {
          phase: "failed",
          verificationStatus: "failed",
          lastError: verify.error,
        });
        return { status: "failed", error: verify.error };
      }

      if (
        !job.sourceEvidence?.firestore ||
        !job.sourceEvidence?.postgres ||
        !job.sourceEvidence?.supabase ||
        !job.sourceEvidence?.financial
      ) {
        await patchJob(deps, job.id, {
          phase: "failed",
          verificationStatus: "failed",
          lastError: "Backup source evidence is incomplete before verify.",
        });
        return { status: "failed", error: "Backup source evidence is incomplete before verify." };
      }

      const bodies = await loadFullBackupVerificationBodies(deps.storage, {
        artifacts,
        sourceEvidence: job.sourceEvidence,
      });
      const verifiedAtIso = new Date().toISOString();
      const binding = buildTenantBackupEvidenceBinding({
        gymId: deps.gymId,
        backupId: deps.backupId,
        backupJobId: deps.jobId,
        manifestChecksumSha256: verify.manifestChecksumSha256,
        backupVerifiedAt: verifiedAtIso,
      });
      const evidenceWithBinding = {
        ...(job.sourceEvidence as TenantBackupSourceEvidenceV1),
        binding,
      };
      const evidenceCheck = validateTenantBackupSourceEvidence({
        evidence: evidenceWithBinding,
        artifacts,
        gymId: deps.gymId,
        backupId: deps.backupId,
        backupJobId: deps.jobId,
        manifestChecksumSha256: verify.manifestChecksumSha256,
        pathsManifestBody: bodies.pathsManifestBody,
        objectBodiesByArtifactPath: bodies.objectBodiesByArtifactPath,
        postgresArtifactBodies: bodies.postgresArtifactBodies,
      });
      if (!evidenceCheck.ok) {
        await patchJob(deps, job.id, {
          phase: "failed",
          verificationStatus: "failed",
          lastError: evidenceCheck.reason,
        });
        return { status: "failed", error: evidenceCheck.reason };
      }

      await patchJob(deps, job.id, {
        phase: "restore_validate",
        verificationStatus: "verified",
        verificationCompletedAt: Timestamp.now(),
        manifestChecksumSha256: verify.manifestChecksumSha256,
        sourceEvidence: evidenceWithBinding,
        sourceEvidenceArtifactsVerified: true,
      });
      return { status: "advanced", phase: "restore_validate" };
    }

    if (job.phase === "restore_validate") {
      const manifestPath = artifactPath(prefix, "manifest.json");
      const manifest = JSON.parse(
        (await deps.storage.download(manifestPath)).toString("utf8"),
      ) as TenantBackupManifestV1;
      const target = createIsolatedRestoreTarget();
      await restoreIntoIsolatedTarget(deps.storage, manifest, target, deps.gymId);
      const restored = validateRestoredCounts(target, manifest);
      if (!restored.ok) {
        await patchJob(deps, job.id, {
          phase: "failed",
          restoreValidationStatus: "failed",
          lastError: restored.error,
        });
        return { status: "failed", error: restored.error };
      }
      await patchJob(deps, job.id, {
        phase: "completed",
        restoreValidationStatus: "passed",
        restoreValidatedAt: Timestamp.now(),
      });
      return { status: "completed", manifestChecksumSha256: job.manifestChecksumSha256 ?? "" };
    }

    return { status: "failed", error: `Unexpected backup phase ${job.phase}.` };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Backup failed.";
    await patchJob(deps, job.id, { phase: "failed", lastError: message });
    return { status: "failed", error: message };
  }
}

async function patchJob(
  deps: TenantBackupRunnerDeps,
  jobId: string,
  patch: Record<string, unknown>,
) {
  const { getRepositories } = await import("@/lib/firestore");
  const { gymTenantBackupJobs } = getRepositories() as ReturnType<typeof getRepositories> & {
    gymTenantBackupJobs: { patch: (id: string, p: Record<string, unknown>) => Promise<void> };
  };
  await gymTenantBackupJobs.patch(jobId, patch);
}