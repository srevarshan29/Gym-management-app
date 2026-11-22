import type { Firestore } from "firebase-admin/firestore";

import type { TenantBackupArtifactEntry } from "@/lib/gym-lifecycle/backup/backup-format";
import type { SourceEvidenceValidationResult } from "@/lib/gym-lifecycle/backup/backup-source-evidence";
import {
  TENANT_FINANCIAL_COLLECTIONS,
  TENANT_GYM_ID_COLLECTIONS,
} from "@/lib/gym-lifecycle/backup/tenant-data-inventory";

export async function buildTenantFirestoreInventoryCounts(
  db: Firestore,
  gymId: string,
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const collection of TENANT_GYM_ID_COLLECTIONS) {
    const snap = await db
      .collection(collection)
      .where("gymId", "==", gymId)
      .count()
      .get();
    counts[`firestore:${collection}`] = snap.data().count;
  }
  for (const c of TENANT_FINANCIAL_COLLECTIONS) {
    counts[`financial:${c}`] = counts[`firestore:${c}`] ?? 0;
  }
  return counts;
}

export function countExportedFirestoreDocsInArtifacts(
  artifacts: TenantBackupArtifactEntry[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const collection of TENANT_GYM_ID_COLLECTIONS) {
    counts[`firestore:${collection}`] = artifacts
      .filter((a) => a.path.includes(`/firestore/${collection}/`))
      .reduce((sum, a) => sum + a.recordCount, 0);
  }
  const roots = artifacts.find((a) => a.path.endsWith("/firestore/gym-roots.json"));
  counts["firestore:gym-roots"] = roots?.recordCount ?? 0;
  for (const c of TENANT_FINANCIAL_COLLECTIONS) {
    counts[`financial:${c}`] = counts[`firestore:${c}`] ?? 0;
  }
  return counts;
}

/**
 * Ensures live Firestore tenant counts match exported shard record counts before manifest.
 */
export function validateFirestoreExportMatchesLiveInventory(input: {
  artifacts: TenantBackupArtifactEntry[];
  liveInventory: Record<string, number>;
  priorInventory?: Record<string, number> | null;
}): SourceEvidenceValidationResult {
  const exported = countExportedFirestoreDocsInArtifacts(input.artifacts);

  for (const collection of TENANT_GYM_ID_COLLECTIONS) {
    const key = `firestore:${collection}`;
    const live = input.liveInventory[key] ?? 0;
    const fromArtifacts = exported[key] ?? 0;
    if (fromArtifacts !== live) {
      return {
        ok: false,
        reason: `Firestore export count mismatch for ${collection} (live ${live}, artifacts ${fromArtifacts}).`,
      };
    }
    if (live > 0 && fromArtifacts === 0) {
      return {
        ok: false,
        reason: `Firestore collection ${collection} has documents but no export shards.`,
      };
    }
  }

  const liveRoots = input.liveInventory["firestore:gym-roots"];
  if (liveRoots != null) {
    const rootArtifact = input.artifacts.find((a) => a.path.endsWith("/firestore/gym-roots.json"));
    const exportedRoots = rootArtifact?.recordCount ?? 0;
    if (exportedRoots !== liveRoots) {
      return {
        ok: false,
        reason: `Firestore gym root export count mismatch (live ${liveRoots}, artifacts ${exportedRoots}).`,
      };
    }
  }

  if (input.priorInventory) {
    for (const collection of TENANT_GYM_ID_COLLECTIONS) {
      const key = `firestore:${collection}`;
      const prior = input.priorInventory[key];
      const live = input.liveInventory[key];
      if (prior != null && prior !== live) {
        return {
          ok: false,
          reason: `Firestore inventory drift detected for ${collection} since backup started (was ${prior}, now ${live}).`,
        };
      }
    }
  }

  const shardCollections = new Set<string>();
  for (const artifact of input.artifacts) {
    const match = artifact.path.match(/\/firestore\/([^/]+)\//);
    if (match?.[1] && match[1] !== "gym-roots") {
      shardCollections.add(match[1]);
    }
  }
  for (const name of shardCollections) {
    if (!TENANT_GYM_ID_COLLECTIONS.includes(name)) {
      return {
        ok: false,
        reason: `Unexpected Firestore export shard for collection ${name}.`,
      };
    }
  }

  return { ok: true };
}

export function mergeManifestInventoryCounts(input: {
  liveFirestore: Record<string, number>;
  existing: Record<string, number>;
}): Record<string, number> {
  const merged: Record<string, number> = { ...input.existing };
  for (const [key, value] of Object.entries(input.liveFirestore)) {
    if (key.startsWith("firestore:") || key.startsWith("financial:")) {
      merged[key] = value;
    }
  }
  return merged;
}