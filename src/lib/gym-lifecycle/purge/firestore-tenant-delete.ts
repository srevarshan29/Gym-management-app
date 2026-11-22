import type { Firestore } from "firebase-admin/firestore";

export async function deleteFirestoreTenantDocumentsPage(
  db: Firestore,
  input: {
    collection: string;
    gymId: string;
    cursor?: string | null;
    limit: number;
  },
): Promise<{ deleted: number; nextCursor: string | null }> {
  let query = db
    .collection(input.collection)
    .where("gymId", "==", input.gymId)
    .orderBy("createdAt", "asc")
    .limit(input.limit);

  if (input.cursor) {
    const cursorDoc = await db.collection(input.collection).doc(input.cursor).get();
    if (cursorDoc.exists) {
      query = query.startAfter(cursorDoc);
    }
  }

  const snap = await query.get();
  if (snap.empty) {
    return { deleted: 0, nextCursor: null };
  }

  const batch = db.batch();
  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.gymId !== input.gymId) {
      throw new Error(`Refusing to delete cross-tenant document ${doc.id}.`);
    }
    batch.delete(doc.ref);
  }
  await batch.commit();

  const last = snap.docs[snap.docs.length - 1]!;
  const hasMore = snap.docs.length >= input.limit;
  return {
    deleted: snap.docs.length,
    nextCursor: hasMore ? last.id : null,
  };
}