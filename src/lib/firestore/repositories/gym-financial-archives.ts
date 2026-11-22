import { Timestamp, type Firestore } from "firebase-admin/firestore";

import { COLLECTIONS } from "@/lib/firestore/collections";
import { serverTimestamps } from "@/lib/firestore/serialize";

export type GymFinancialArchiveDoc = {
  gymId: string;
  gymName: string;
  archivedAt: Timestamp;
  retentionPolicyConfigured: boolean;
  financialArchiveStatus: "incomplete" | "complete";
  financialArchiveVerifiedAt: Timestamp | null;
  payments: unknown[];
  receipts: unknown[];
  ledgerTransactions: unknown[];
  subscriptions: unknown[];
  backupArtifactRef: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export class GymFinancialArchivesRepository {
  constructor(private readonly db: Firestore) {}

  private docRef(gymId: string) {
    return this.db.collection(COLLECTIONS.gymFinancialArchives).doc(gymId);
  }

  async upsertArchive(input: {
    gymId: string;
    gymName: string;
    payments: unknown[];
    receipts: unknown[];
    ledgerTransactions: unknown[];
    subscriptions: unknown[];
    backupArtifactRef: string | null;
    retentionPolicyConfigured: boolean;
    financialArchiveStatus: "incomplete" | "complete";
    financialArchiveVerifiedAt: Date | null;
  }) {
    const now = Timestamp.now();
    await this.docRef(input.gymId).set({
      gymId: input.gymId,
      gymName: input.gymName,
      archivedAt: now,
      retentionPolicyConfigured: input.retentionPolicyConfigured,
      financialArchiveStatus: input.financialArchiveStatus,
      financialArchiveVerifiedAt: input.financialArchiveVerifiedAt
        ? Timestamp.fromDate(input.financialArchiveVerifiedAt)
        : null,
      payments: input.payments,
      receipts: input.receipts,
      ledgerTransactions: input.ledgerTransactions,
      subscriptions: input.subscriptions,
      backupArtifactRef: input.backupArtifactRef,
      ...serverTimestamps(now),
    });
  }

  async getByGymId(gymId: string) {
    const snap = await this.docRef(gymId).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...(snap.data() as GymFinancialArchiveDoc) };
  }
}