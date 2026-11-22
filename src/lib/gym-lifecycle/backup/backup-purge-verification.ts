import type { BackupStorageAdapter } from "@/lib/gym-lifecycle/backup/backup-storage";
import { createSupabaseBackupStorageAdapter } from "@/lib/gym-lifecycle/backup/backup-storage";
import {
  evaluatePromotedFullBackupEvidence,
  type PostgresArtifactBodies,
  type SourceEvidenceValidationResult,
} from "@/lib/gym-lifecycle/backup/backup-source-evidence";
import { validateTenantBackupStorageConfig } from "@/lib/gym-lifecycle/backup/config";
import type { GymTenantBackupJobDoc } from "@/lib/firestore/repositories/gym-tenant-backup-jobs";
import type { GymDoc } from "@/lib/firestore/types";

export type FullBackupVerificationBodies = {
  pathsManifestBody: Buffer;
  objectBodiesByArtifactPath: Record<string, Buffer>;
  postgresArtifactBodies: PostgresArtifactBodies;
};

export async function loadFullBackupVerificationBodies(
  storage: BackupStorageAdapter,
  job: Pick<GymTenantBackupJobDoc, "artifacts" | "sourceEvidence">,
): Promise<FullBackupVerificationBodies> {
  const pathsPath = job.sourceEvidence?.supabase?.pathsManifestPath;
  if (!pathsPath) {
    throw new Error("Backup job is missing Supabase paths manifest path.");
  }
  const pathsManifestBody = await storage.download(pathsPath);

  const objectBodiesByArtifactPath: Record<string, Buffer> = {};
  for (const artifact of job.artifacts.filter((a) => a.path.includes("/storage/objects/"))) {
    objectBodiesByArtifactPath[artifact.path] = await storage.download(artifact.path);
  }

  const postgresArtifactBodies: PostgresArtifactBodies = {};
  for (const artifact of job.artifacts.filter((a) => a.path.includes("/postgres/"))) {
    postgresArtifactBodies[artifact.path] = await storage.download(artifact.path);
  }

  return { pathsManifestBody, objectBodiesByArtifactPath, postgresArtifactBodies };
}

export async function verifyPromotedFullBackupForPurge(input: {
  gym: GymDoc & { id: string };
  backupJob: (GymTenantBackupJobDoc & { id: string }) | null;
  bodies: FullBackupVerificationBodies | null;
}): Promise<SourceEvidenceValidationResult> {
  if (!input.bodies) {
    return {
      ok: false,
      reason: "Full backup manifest and artifact bodies could not be loaded for purge verification.",
    };
  }
  return evaluatePromotedFullBackupEvidence({
    gym: input.gym,
    backupJob: input.backupJob,
    pathsManifestBody: input.bodies.pathsManifestBody,
    objectBodiesByArtifactPath: input.bodies.objectBodiesByArtifactPath,
    postgresArtifactBodies: input.bodies.postgresArtifactBodies,
  });
}

/** Loads artifact bodies from the private backup bucket (read-only). Does not require export flags. */
export async function tryLoadStoredFullBackupBodies(
  job: GymTenantBackupJobDoc & { id: string },
): Promise<{ ok: true; bodies: FullBackupVerificationBodies } | { ok: false; error: string }> {
  const configured = validateTenantBackupStorageConfig();
  if (!configured.ok) {
    return { ok: false, error: configured.error };
  }
  try {
    const storage = await createSupabaseBackupStorageAdapter();
    const bodies = await loadFullBackupVerificationBodies(storage, job);
    return { ok: true, bodies };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to load backup artifacts.",
    };
  }
}

/** @deprecated Use tryLoadStoredFullBackupBodies */
export async function tryLoadProductionFullBackupBodies(
  job: GymTenantBackupJobDoc & { id: string },
): Promise<FullBackupVerificationBodies | null> {
  const loaded = await tryLoadStoredFullBackupBodies(job);
  return loaded.ok ? loaded.bodies : null;
}