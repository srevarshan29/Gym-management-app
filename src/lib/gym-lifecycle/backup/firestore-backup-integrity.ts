import type { Firestore } from "firebase-admin/firestore";

import type { BackupStorageAdapter } from "@/lib/gym-lifecycle/backup/backup-storage";
import type { TenantBackupArtifactEntry } from "@/lib/gym-lifecycle/backup/backup-format";
import { fingerprintFirestoreDocument } from "@/lib/gym-lifecycle/backup/firestore-canonical";
import {
  exportFirestoreCollectionPage,
  exportGymRootDocuments,
  assertTenantOwnership,
  type SerializedFirestoreDoc,
} from "@/lib/gym-lifecycle/backup/firestore-tenant-export";
import type { SourceEvidenceValidationResult } from "@/lib/gym-lifecycle/backup/backup-source-evidence";
import {
  TENANT_BACKUP_GYM_ROOT_DOCS,
  TENANT_GYM_ID_COLLECTIONS,
} from "@/lib/gym-lifecycle/backup/tenant-data-inventory";

export type FirestoreDocumentFingerprint = {
  path: string;
  id: string;
  collection: string;
  contentHashSha256: string;
  updateTimeIso: string | null;
  gymId: string | null;
};

export function fingerprintFromSerializedDoc(doc: SerializedFirestoreDoc): FirestoreDocumentFingerprint {
  const gymId =
    typeof doc.data.gymId === "string"
      ? doc.data.gymId
      : doc.data.gymId === null
        ? null
        : doc.collection === "gyms" || doc.id
          ? doc.collection === "gyms"
            ? doc.id
            : null
          : null;
  return {
    path: doc.path,
    id: doc.id,
    collection: doc.collection,
    contentHashSha256: doc.contentHashSha256,
    updateTimeIso: doc.updateTimeIso ?? null,
    gymId,
  };
}

export function fingerprintsFromShardDocs(docs: SerializedFirestoreDoc[]): FirestoreDocumentFingerprint[] {
  return docs.map(fingerprintFromSerializedDoc);
}

function fingerprintMap(
  fingerprints: FirestoreDocumentFingerprint[],
): Map<string, FirestoreDocumentFingerprint> {
  const map = new Map<string, FirestoreDocumentFingerprint>();
  for (const fp of fingerprints) {
    if (map.has(fp.path)) {
      throw new Error(`Duplicate exported Firestore path in backup: ${fp.path}`);
    }
    map.set(fp.path, fp);
  }
  return map;
}

export function compareFirestoreFingerprintMaps(input: {
  exported: FirestoreDocumentFingerprint[];
  live: FirestoreDocumentFingerprint[];
  expectedGymId: string;
}): SourceEvidenceValidationResult {
  const exportedMap = fingerprintMap(input.exported);
  const liveMap = fingerprintMap(input.live);

  for (const fp of input.exported) {
    if (fp.gymId != null && fp.gymId !== input.expectedGymId) {
      return {
        ok: false,
        reason: `Exported document ${fp.path} has cross-gym contamination (gymId ${fp.gymId}).`,
      };
    }
  }

  for (const fp of input.live) {
    if (fp.gymId != null && fp.gymId !== input.expectedGymId) {
      return {
        ok: false,
        reason: `Live document ${fp.path} has unexpected gymId ${fp.gymId}.`,
      };
    }
  }

  for (const [path, liveFp] of liveMap) {
    const exportedFp = exportedMap.get(path);
    if (!exportedFp) {
      return { ok: false, reason: `Live Firestore document missing from export: ${path}.` };
    }
    if (exportedFp.contentHashSha256 !== liveFp.contentHashSha256) {
      return {
        ok: false,
        reason: `Firestore document content changed for ${path} (export hash differs from live).`,
      };
    }
    if (
      exportedFp.updateTimeIso &&
      liveFp.updateTimeIso &&
      exportedFp.updateTimeIso !== liveFp.updateTimeIso
    ) {
      return {
        ok: false,
        reason: `Firestore updateTime changed for ${path} during backup.`,
      };
    }
    if (exportedFp.id !== liveFp.id || exportedFp.collection !== liveFp.collection) {
      return {
        ok: false,
        reason: `Firestore document identity mismatch for ${path}.`,
      };
    }
  }

  for (const path of exportedMap.keys()) {
    if (!liveMap.has(path)) {
      return { ok: false, reason: `Exported Firestore document no longer exists: ${path}.` };
    }
  }

  if (exportedMap.size !== liveMap.size) {
    return {
      ok: false,
      reason: `Firestore document count mismatch (export ${exportedMap.size}, live ${liveMap.size}).`,
    };
  }

  return { ok: true };
}

function isFirestoreDataShardArtifact(path: string): boolean {
  return (
    path.includes("/firestore/") &&
    !path.endsWith("/firestore/gym-roots.json") &&
    path.endsWith(".json")
  );
}

export async function collectExportedFirestoreFingerprints(
  storage: BackupStorageAdapter,
  artifacts: TenantBackupArtifactEntry[],
): Promise<FirestoreDocumentFingerprint[]> {
  const shards = artifacts.filter((a) => isFirestoreDataShardArtifact(a.path));
  const rootArtifact = artifacts.find((a) => a.path.endsWith("/firestore/gym-roots.json"));
  const out: FirestoreDocumentFingerprint[] = [];

  if (rootArtifact) {
    const body = await storage.download(rootArtifact.path);
    const roots = JSON.parse(body.toString("utf8")) as SerializedFirestoreDoc[];
    out.push(...fingerprintsFromShardDocs(roots));
  }

  for (const shard of shards) {
    const body = await storage.download(shard.path);
    const docs = JSON.parse(body.toString("utf8")) as SerializedFirestoreDoc[];
    for (const doc of docs) {
      const expectedHash = fingerprintFirestoreDocument({
        path: doc.path,
        collection: doc.collection,
        id: doc.id,
        data: doc.data,
      });
      if (doc.contentHashSha256 !== expectedHash) {
        throw new Error(`Firestore shard document hash mismatch in artifact ${shard.path} (${doc.path}).`);
      }
    }
    out.push(...fingerprintsFromShardDocs(docs));
  }

  return out;
}

export async function collectLiveFirestoreFingerprints(
  db: Firestore,
  gymId: string,
): Promise<FirestoreDocumentFingerprint[]> {
  const out: FirestoreDocumentFingerprint[] = [];

  const roots = await exportGymRootDocuments(db, gymId);
  out.push(...fingerprintsFromShardDocs(roots));

  for (const collection of TENANT_GYM_ID_COLLECTIONS) {
    let cursor: string | null = null;
    for (;;) {
      const { docs, nextCursor } = await exportFirestoreCollectionPage(db, gymId, collection, cursor);
      for (const doc of docs) {
        assertTenantOwnership(gymId, collection, doc.data);
      }
      out.push(...fingerprintsFromShardDocs(docs));
      if (!nextCursor) break;
      cursor = nextCursor;
    }
  }

  for (const root of TENANT_BACKUP_GYM_ROOT_DOCS) {
    if (TENANT_GYM_ID_COLLECTIONS.includes(root.collection)) continue;
    void root;
  }

  return out;
}

export async function verifyFirestoreBackupDocumentIntegrity(input: {
  db: Firestore;
  storage: BackupStorageAdapter;
  gymId: string;
  artifacts: TenantBackupArtifactEntry[];
}): Promise<
  | { ok: true; documentCount: number; verifiedAt: string }
  | { ok: false; reason: string }
> {
  try {
    const exported = await collectExportedFirestoreFingerprints(input.storage, input.artifacts);
    const live = await collectLiveFirestoreFingerprints(input.db, input.gymId);
    const cmp = compareFirestoreFingerprintMaps({
      exported,
      live,
      expectedGymId: input.gymId,
    });
    if (!cmp.ok) return cmp;
    return {
      ok: true,
      documentCount: live.length,
      verifiedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "Firestore integrity verification failed.",
    };
  }
}