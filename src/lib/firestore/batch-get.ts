import type { Firestore, DocumentSnapshot } from "firebase-admin/firestore";

const CHUNK_SIZE = 100;

/** Batch-load documents by id using Firestore getAll (fewer round-trips than N×get). */
export async function batchGetByIds<T>(
  db: Firestore,
  collection: string,
  ids: string[],
): Promise<Map<string, T>> {
  const unique = [...new Set(ids)];
  const map = new Map<string, T>();
  if (unique.length === 0) return map;

  for (let i = 0; i < unique.length; i += CHUNK_SIZE) {
    const chunk = unique.slice(i, i + CHUNK_SIZE);
    const refs = chunk.map((id) => db.collection(collection).doc(id));
    const snaps: DocumentSnapshot[] = await db.getAll(...refs);
    for (const snap of snaps) {
      if (!snap.exists) continue;
      map.set(snap.id, snap.data() as T);
    }
  }

  return map;
}
