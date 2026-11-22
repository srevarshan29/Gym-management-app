import type { TenantBackupArtifactEntry } from "@/lib/gym-lifecycle/backup/backup-format";
import { sha256Hex } from "@/lib/gym-lifecycle/backup/checksum";
import { gymSupabaseStoragePrefix } from "@/lib/gym-lifecycle/purge/inventory";
import type { SourceEvidenceValidationResult } from "@/lib/gym-lifecycle/backup/backup-source-evidence";

const OBJECT_ARTIFACT_PATTERN = /\/storage\/objects\/(\d+)-[a-f0-9]+\.bin$/i;

export function parseTenantStoragePathsManifest(body: Buffer): string[] {
  const parsed = JSON.parse(body.toString("utf8")) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("Supabase paths manifest must be a JSON array.");
  }
  return parsed.map((p) => String(p));
}

export function validateSupabaseStorageBackupArtifacts(input: {
  gymId: string;
  pathsManifestBody: Buffer;
  artifacts: TenantBackupArtifactEntry[];
  objectBodiesByArtifactPath?: Record<string, Buffer>;
}): SourceEvidenceValidationResult {
  let paths: string[];
  try {
    paths = parseTenantStoragePathsManifest(input.pathsManifestBody);
  } catch (error) {
    return {
      ok: false,
      reason:
        error instanceof Error ? error.message : "Supabase paths manifest is invalid.",
    };
  }

  const tenantPrefix = gymSupabaseStoragePrefix(input.gymId);
  const unique = new Set<string>();
  for (const path of paths) {
    if (!path.startsWith(tenantPrefix)) {
      return {
        ok: false,
        reason: `Supabase path escapes tenant prefix: ${path}`,
      };
    }
    if (unique.has(path)) {
      return { ok: false, reason: `Duplicate Supabase storage path: ${path}` };
    }
    unique.add(path);
  }

  const objectArtifacts = input.artifacts.filter((a) => a.path.includes("/storage/objects/"));
  if (objectArtifacts.length !== paths.length) {
    return {
      ok: false,
      reason: "Supabase binary artifact count does not match paths manifest length.",
    };
  }

  const indexToArtifact = new Map<number, TenantBackupArtifactEntry>();
  for (const artifact of objectArtifacts) {
    const match = artifact.path.match(OBJECT_ARTIFACT_PATTERN);
    if (!match?.[1]) {
      return {
        ok: false,
        reason: `Unexpected Supabase binary artifact name: ${artifact.path}`,
      };
    }
    const index = Number(match[1]);
    if (indexToArtifact.has(index)) {
      return { ok: false, reason: `Duplicate Supabase binary artifact index ${index}.` };
    }
    indexToArtifact.set(index, artifact);
  }

  for (let index = 0; index < paths.length; index++) {
    const artifact = indexToArtifact.get(index);
    if (!artifact) {
      return {
        ok: false,
        reason: `Missing Supabase binary artifact for storage index ${index}.`,
      };
    }
    if (artifact.recordCount !== 1) {
      return {
        ok: false,
        reason: `Supabase binary artifact for index ${index} has invalid record count.`,
      };
    }
    const body = input.objectBodiesByArtifactPath?.[artifact.path];
    if (body) {
      const checksum = sha256Hex(body);
      if (checksum !== artifact.checksumSha256) {
        return {
          ok: false,
          reason: `Supabase binary checksum mismatch for index ${index}.`,
        };
      }
      if (body.byteLength !== artifact.sizeBytes) {
        return {
          ok: false,
          reason: `Supabase binary size mismatch for index ${index}.`,
        };
      }
    }
  }

  const unexpected = [...indexToArtifact.keys()].filter((i) => i < 0 || i >= paths.length);
  if (unexpected.length > 0) {
    return { ok: false, reason: "Unexpected Supabase binary artifacts outside path manifest." };
  }

  return { ok: true };
}