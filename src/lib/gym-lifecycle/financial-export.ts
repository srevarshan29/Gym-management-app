import { FieldPath, type Firestore } from "firebase-admin/firestore";

import { COLLECTIONS } from "@/lib/firestore/collections";
import type { PaymentDoc, ReceiptDoc, SubscriptionDoc } from "@/lib/firestore/types";

const PAGE = 500;

async function listDocsByGymId<T>(
  db: Firestore,
  collection: string,
  gymId: string,
): Promise<Array<T & { id: string }>> {
  const out: Array<T & { id: string }> = [];
  let cursor: import("firebase-admin/firestore").QueryDocumentSnapshot | undefined;

  for (;;) {
    let query = db
      .collection(collection)
      .where("gymId", "==", gymId)
      .orderBy(FieldPath.documentId())
      .limit(PAGE);
    if (cursor) query = query.startAfter(cursor);
    const snap = await query.get();
    if (snap.empty) break;
    for (const doc of snap.docs) {
      out.push({ id: doc.id, ...(doc.data() as T) });
    }
    if (snap.docs.length < PAGE) break;
    cursor = snap.docs[snap.docs.length - 1];
  }

  return out;
}

export async function exportGymFinancialRecords(
  db: Firestore,
  gymId: string,
): Promise<{
  payments: Array<PaymentDoc & { id: string }>;
  receipts: Array<ReceiptDoc & { id: string }>;
  ledgerTransactions: Array<Record<string, unknown> & { id: string }>;
  subscriptions: Array<SubscriptionDoc & { id: string }>;
}> {
  const [payments, receipts, ledgerTransactions, subscriptions] = await Promise.all([
    listDocsByGymId<PaymentDoc>(db, COLLECTIONS.payments, gymId),
    listDocsByGymId<ReceiptDoc>(db, COLLECTIONS.receipts, gymId),
    listDocsByGymId<Record<string, unknown>>(db, COLLECTIONS.ledgerTransactions, gymId),
    listDocsByGymId<SubscriptionDoc>(db, COLLECTIONS.subscriptions, gymId),
  ]);
  return { payments, receipts, ledgerTransactions, subscriptions };
}