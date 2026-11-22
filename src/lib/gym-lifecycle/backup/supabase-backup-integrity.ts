import type { BackupStorageAdapter } from "@/lib/gym-lifecycle/backup/backup-storage";
import type { TenantBackupArtifactEntry } from "@/lib/gym-lifecycle/backup/backup-format";
import { sha256Hex } from "@/lib/gym-lifecycle/backup/checksum";
import { parseTenantStoragePathsManifest } from "@/lib/gym-lifecycle/backup/backup-supabase-artifact-verify";
import { gymSupabaseStoragePrefix } from "@/lib/gym-lifecycle/purge/inventory";
import {
  listAllTenantStorageObjects,
  type SupabaseStorageLister,
} from "@/lib/gym-lifecycle/backup/supabase-tenant-export";
import type { SourceEvidenceValidationResult } from "@/lib/gym-lifecycle/backup/backup-source-evidence";

const OBJECT_ARTIFACT_PATTERN = /\/storage\/objects\/(\d+)-[a-f0-9]+\.bin$/i;

export async function verifySupabaseStoragePathDrift(input: {
  lister: SupabaseStorageLister;
  gymId: string;
  pathsManifestBody: Buffer;
  artifacts: TenantBackupArtifactEntry[];
}): Promise<SourceEvidenceValidationResult> {
  let exportedPaths: string[];
  try {
    exportedPaths = parseTenantStoragePathsManifest(input.pathsManifestBody);
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "Invalid Supabase paths manifest.",
    };
  }

  const prefix = gymSupabaseStoragePrefix(input.gymId);
  for (const path of exportedPaths) {
    if (!path.startsWith(prefix)) {
      return { ok: false, reason: `Exported Supabase path outside tenant prefix: ${path}` };
    }
  }

  const livePaths = await listAllTenantStorageObjects(input.lister, input.gymId);
  const liveSet = new Set(livePaths);
  const exportSet = new Set(exportedPaths);

  for (const path of exportSet) {
    if (!liveSet.has(path)) {
      return { ok: false, reason: `Supabase object in export no longer exists: ${path}` };
    }
  }
  for (const path of liveSet) {
    if (!exportSet.has(path)) {
      return { ok: false, reason: `New Supabase object after export: ${path}` };
    }
  }

  const objectArtifacts = input.artifacts.filter((a) => a.path.includes("/storage/objects/"));
  if (objectArtifacts.length !== exportedPaths.length) {
    return {
      ok: false,
      reason: "Supabase object artifact count does not match paths manifest.",
    };
  }

  return { ok: true };
}

export async function verifySupabaseStorageContentIntegrity(input: {
  lister: SupabaseStorageLister;
  storage: BackupStorageAdapter;
  gymId: string;
  pathsManifestBody: Buffer;
  artifacts: TenantBackupArtifactEntry[];
}): Promise<SourceEvidenceValidationResult> {
  const drift = await verifySupabaseStoragePathDrift({
    lister: input.lister,
    gymId: input.gymId,
    pathsManifestBody: input.pathsManifestBody,
    artifacts: input.artifacts,
  });
  if (!drift.ok) return drift;

  let exportedPaths: string[];
  try {
    exportedPaths = parseTenantStoragePathsManifest(input.pathsManifestBody);
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "Invalid Supabase paths manifest.",
    };
  }

  const indexToArtifact = new Map<number, TenantBackupArtifactEntry>();
  for (const artifact of input.artifacts.filter((a) => a.path.includes("/storage/objects/"))) {
    const match = artifact.path.match(OBJECT_ARTIFACT_PATTERN);
    if (!match?.[1]) {
      return { ok: false, reason: `Unexpected Supabase binary artifact: ${artifact.path}` };
    }
    const index = Number(match[1]);
    if (indexToArtifact.has(index)) {
      return { ok: false, reason: `Duplicate Supabase artifact index ${index}.` };
    }
    indexToArtifact.set(index, artifact);
  }

  for (let index = 0; index < exportedPaths.length; index++) {
    const path = exportedPaths[index]!;
    const artifact = indexToArtifact.get(index);
    if (!artifact) {
      return { ok: false, reason: `Missing Supabase artifact for index ${index}.` };
    }

    let liveBytes: Buffer;
    try {
      liveBytes = await input.lister.download(path);
    } catch (error) {
      return {
        ok: false,
        reason:
          error instanceof Error
            ? `Cannot read live Supabase object ${path}: ${error.message}`
            : `Cannot read live Supabase object ${path}.`,
      };
    }

    if (liveBytes.byteLength !== artifact.sizeBytes) {
      return {
        ok: false,
        reason: `Supabase size mismatch at ${path} (live ${liveBytes.byteLength}, artifact ${artifact.sizeBytes}).`,
      };
    }

    const liveHash = sha256Hex(liveBytes);
    if (liveHash !== artifact.checksumSha256) {
      return {
        ok: false,
        reason: `Supabase content replaced at ${path} (checksum differs from export).`,
      };
    }

    let exportedBytes: Buffer;
    try {
      exportedBytes = await input.storage.download(artifact.path);
    } catch (error) {
      return {
        ok: false,
        reason:
          error instanceof Error
            ? `Cannot read exported Supabase artifact ${artifact.path}: ${error.message}`
            : `Cannot read exported Supabase artifact.`,
      };
    }

    if (sha256Hex(exportedBytes) !== artifact.checksumSha256) {
      return {
        ok: false,
        reason: `Exported Supabase artifact checksum corrupt for index ${index}.`,
      };
    }
    if (sha256Hex(exportedBytes) !== liveHash) {
      return {
        ok: false,
        reason: `Supabase byte mismatch between live object and export at ${path}.`,
      };
    }
  }

  return { ok: true };
}

/** @deprecated use verifySupabaseStorageContentIntegrity */
export async function verifySupabaseStorageExportDrift(input: {
  lister: SupabaseStorageLister;
  gymId: string;
  pathsManifestBody: Buffer;
  artifacts: TenantBackupArtifactEntry[];
}): Promise<SourceEvidenceValidationResult> {
  return verifySupabaseStoragePathDrift(input);
}