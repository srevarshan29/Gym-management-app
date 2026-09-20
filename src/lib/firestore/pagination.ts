import type {
  Query,
  QueryDocumentSnapshot,
} from "firebase-admin/firestore";

/**
 * Fetch a numbered page using Firestore cursor pagination (`startAfter`).
 * Performs one query per page hop (each bounded to `pageSize` docs).
 */
export async function queryPageByNumber(
  baseQuery: Query,
  page: number,
  pageSize: number,
): Promise<QueryDocumentSnapshot[]> {
  const safePage = Math.max(1, Math.floor(page));
  if (safePage === 1) {
    const snap = await baseQuery.limit(pageSize).get();
    return snap.docs;
  }

  let cursor: QueryDocumentSnapshot | undefined;
  for (let p = 1; p < safePage; p++) {
    let hopQuery = baseQuery.limit(pageSize);
    if (cursor) hopQuery = hopQuery.startAfter(cursor);
    const snap = await hopQuery.get();
    if (snap.empty) return [];
    cursor = snap.docs[snap.docs.length - 1];
  }

  let pageQuery = baseQuery.limit(pageSize);
  if (cursor) pageQuery = pageQuery.startAfter(cursor);
  const snap = await pageQuery.get();
  return snap.docs;
}
