import { sha256Hex } from "@/lib/gym-lifecycle/backup/checksum";
import type {
  TenantBackupArtifactEntry,
  TenantBackupManifestV1,
} from "@/lib/gym-lifecycle/backup/backup-format";
import type { BackupStorageAdapter } from "@/lib/gym-lifecycle/backup/backup-storage";

export type BackupVerificationResult =
  | { ok: true; manifestChecksumSha256: string }
  | { ok: false; error: string };

export async function verifyArtifactChecksums(
  storage: BackupStorageAdapter,
  artifacts: TenantBackupArtifactEntry[],
): Promise<BackupVerificationResult> {
  for (const artifact of artifacts) {
    let body: Buffer;
    try {
      body = await storage.download(artifact.path);
    } catch (error) {
      return {
        ok: false,
        error: `Missing artifact ${artifact.path}: ${error instanceof Error ? error.message : "unknown"}`,
      };
    }
    const checksum = sha256Hex(body);
    if (checksum !== artifact.checksumSha256) {
      return {
        ok: false,
        error: `Checksum mismatch for ${artifact.path}.`,
      };
    }
    if (body.byteLength !== artifact.sizeBytes) {
      return {
        ok: false,
        error: `Size mismatch for ${artifact.path}.`,
      };
    }
  }
  return { ok: true, manifestChecksumSha256: "" };
}

export function finalizeManifestChecksum(manifest: TenantBackupManifestV1): string {
  const copy = { ...manifest, manifestChecksumSha256: null };
  return sha256Hex(JSON.stringify(copy));
}

export async function verifyTenantBackupManifest(
  storage: BackupStorageAdapter,
  manifestPath: string,
  expectedInventory: Record<string, number>,
): Promise<BackupVerificationResult> {
  const raw = await storage.download(manifestPath);
  const manifest = JSON.parse(raw.toString("utf8")) as TenantBackupManifestV1;
  if (!manifest.artifacts?.length) {
    return { ok: false, error: "Manifest has no artifacts." };
  }

  const artifactResult = await verifyArtifactChecksums(storage, manifest.artifacts);
  if (!artifactResult.ok) return artifactResult;

  for (const [key, expected] of Object.entries(expectedInventory)) {
    const actual = manifest.inventoryCounts[key];
    if (actual == null) {
      return { ok: false, error: `Manifest missing inventory count for ${key}.` };
    }
    if (actual !== expected) {
      return {
        ok: false,
        error: `Manifest inventory drift for ${key} (expected ${expected}, got ${actual}).`,
      };
    }
    if (key.startsWith("firestore:")) {
      const collection = key.replace("firestore:", "");
      if (collection === "gym-roots") {
        const rootArtifact = manifest.artifacts.find((a) =>
          a.path.endsWith("/firestore/gym-roots.json"),
        );
        if (expected > 0 && (!rootArtifact || rootArtifact.recordCount < expected)) {
          return {
            ok: false,
            error: "Firestore gym root artifact record count below inventory.",
          };
        }
      } else {
        const shardDocs = manifest.artifacts
          .filter((a) => a.path.includes(`/firestore/${collection}/`))
          .reduce((sum, a) => sum + a.recordCount, 0);
        if (shardDocs < expected) {
          return {
            ok: false,
            error: `Firestore artifact record count below inventory for ${key}.`,
          };
        }
      }
    }
    if (key === "storage:objects") {
      const objectArtifacts = manifest.artifacts.filter((a) =>
        a.path.includes("/storage/objects/"),
      );
      if (objectArtifacts.length < expected) {
        return {
          ok: false,
          error: "Supabase object artifacts are fewer than inventoried objects.",
        };
      }
    }
    if (key.startsWith("postgres:")) {
      const table = key.replace("postgres:", "");
      const tableArtifact = manifest.artifacts.find((a) =>
        a.path.endsWith(`/postgres/${table}.json`),
      );
      if (!tableArtifact) {
        return { ok: false, error: `Postgres export artifact missing for ${table}.` };
      }
      if (tableArtifact.recordCount < expected) {
        return {
          ok: false,
          error: `Postgres artifact record count below inventory for ${table}.`,
        };
      }
    }
  }

  const manifestChecksumSha256 = finalizeManifestChecksum(manifest);
  if (manifest.manifestChecksumSha256 !== manifestChecksumSha256) {
    return { ok: false, error: "Manifest checksum mismatch." };
  }

  return { ok: true, manifestChecksumSha256 };
}