import { FieldPath, type Firestore } from "firebase-admin/firestore";

import {
  canonicalizeFirestoreValue,
  fingerprintFirestoreDocument,
} from "@/lib/gym-lifecycle/backup/firestore-canonical";
import {
  TENANT_BACKUP_GYM_ROOT_DOCS,
  TENANT_GYM_ID_COLLECTIONS,
  assertCollectionAllowedForTenantBackup,
} from "@/lib/gym-lifecycle/backup/tenant-data-inventory";

export type SerializedFirestoreDoc = {
  path: string;
  id: string;
  collection: string;
  data: Record<string, unknown>;
  contentHashSha256: string;
  updateTimeIso: string | null;
};

const PAGE_SIZE = 200;

function serializeFirestoreValue(value: unknown): unknown {
  return canonicalizeFirestoreValue(value);
}

export function assertTenantOwnership(
  gymId: string,
  collection: string,
  doc: Record<string, unknown>,
): void {
  if ("gymId" in doc) {
    if (doc.gymId !== gymId) {
      throw new Error(`Ambiguous tenant ownership in ${collection}: gymId mismatch.`);
    }
    return;
  }
  if (collection === "users" && (doc.gymId === null || doc.gymId === undefined)) {
    return;
  }
  throw new Error(`Cannot establish tenant ownership for ${collection} document.`);
}

export async function exportGymRootDocuments(
  db: Firestore,
  gymId: string,
): Promise<SerializedFirestoreDoc[]> {
  const out: SerializedFirestoreDoc[] = [];
  for (const root of TENANT_BACKUP_GYM_ROOT_DOCS) {
    assertCollectionAllowedForTenantBackup(root.collection);
    const ref = db.collection(root.collection).doc(gymId);
    const snap = await ref.get();
    if (!snap.exists) continue;
    const data = snap.data() as Record<string, unknown>;
    if (root.kind === "gym_doc_id" || root.collection === "gyms" || root.collection === "gymProfiles") {
      if ("gymId" in data && data.gymId !== gymId && root.collection !== "gyms") {
        throw new Error(`Root doc gymId mismatch in ${root.collection}.`);
      }
    }
    const serialized = serializeFirestoreValue(data) as Record<string, unknown>;
    const path = `${root.collection}/${gymId}`;
    out.push({
      path,
      id: gymId,
      collection: root.collection,
      data: serialized,
      contentHashSha256: fingerprintFirestoreDocument({
        path,
        collection: root.collection,
        id: gymId,
        data: serialized,
      }),
      updateTimeIso: snap.updateTime?.toDate().toISOString() ?? null,
    });
  }
  return out;
}

export async function exportFirestoreCollectionPage(
  db: Firestore,
  gymId: string,
  collection: string,
  startAfterDocId?: string | null,
): Promise<{ docs: SerializedFirestoreDoc[]; nextCursor: string | null }> {
  assertCollectionAllowedForTenantBackup(collection);
  if (!TENANT_GYM_ID_COLLECTIONS.includes(collection)) {
    throw new Error(`Collection ${collection} is not in tenant gymId inventory.`);
  }

  let query = db
    .collection(collection)
    .where("gymId", "==", gymId)
    .orderBy(FieldPath.documentId())
    .limit(PAGE_SIZE);

  if (startAfterDocId) {
    const cursorRef = db.collection(collection).doc(startAfterDocId);
    const cursorSnap = await cursorRef.get();
    if (cursorSnap.exists) {
      query = query.startAfter(cursorSnap);
    }
  }

  const snap = await query.get();
  const docs: SerializedFirestoreDoc[] = [];
  for (const doc of snap.docs) {
    const data = doc.data() as Record<string, unknown>;
    assertTenantOwnership(gymId, collection, data);
    const serialized = serializeFirestoreValue(data) as Record<string, unknown>;
    const path = `${collection}/${doc.id}`;
    docs.push({
      path,
      id: doc.id,
      collection,
      data: serialized,
      contentHashSha256: fingerprintFirestoreDocument({
        path,
        collection,
        id: doc.id,
        data: serialized,
      }),
      updateTimeIso: doc.updateTime?.toDate().toISOString() ?? null,
    });
  }

  const last = snap.docs[snap.docs.length - 1];
  const nextCursor = snap.docs.length >= PAGE_SIZE && last ? last.id : null;
  return { docs, nextCursor };
}