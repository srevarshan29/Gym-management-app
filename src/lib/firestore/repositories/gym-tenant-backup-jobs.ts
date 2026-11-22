import { Timestamp, type Firestore } from "firebase-admin/firestore";

import { COLLECTIONS } from "@/lib/firestore/collections";
import type { TenantBackupArtifactEntry, TenantBackupJobPhase } from "@/lib/gym-lifecycle/backup/backup-format";
import type { TenantBackupSourceEvidenceV1 } from "@/lib/gym-lifecycle/backup/backup-source-evidence";
import { serverTimestamps } from "@/lib/firestore/serialize";

export type GymTenantBackupJobDoc = {
  gymId: string;
  deletionJobId: string | null;
  backupId: string;
  phase: TenantBackupJobPhase;
  progress: Record<string, unknown> | null;
  leaseOwner: string | null;
  leaseExpiresAt: Timestamp | null;
  inventoryCounts: Record<string, number> | null;
  artifacts: TenantBackupArtifactEntry[];
  manifestChecksumSha256: string | null;
  sourceEvidence: TenantBackupSourceEvidenceV1 | null;
  sourceEvidenceArtifactsVerified?: boolean;
  verificationStatus: "pending" | "verified" | "failed";
  restoreValidationStatus: "pending" | "passed" | "failed";
  verificationCompletedAt: Timestamp | null;
  restoreValidatedAt: Timestamp | null;
  lastError: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export class GymTenantBackupJobsRepository {
  constructor(private readonly db: Firestore) {}

  private col() {
    return this.db.collection(COLLECTIONS.gymTenantBackupJobs);
  }

  async create(input: {
    id: string;
    gymId: string;
    deletionJobId: string | null;
    backupId: string;
  }) {
    const now = Timestamp.now();
    const doc: GymTenantBackupJobDoc = {
      gymId: input.gymId,
      deletionJobId: input.deletionJobId,
      backupId: input.backupId,
      phase: "inventory",
      progress: null,
      leaseOwner: null,
      leaseExpiresAt: null,
      inventoryCounts: null,
      artifacts: [],
      manifestChecksumSha256: null,
      sourceEvidence: null,
      sourceEvidenceArtifactsVerified: false,
      verificationStatus: "pending",
      restoreValidationStatus: "pending",
      verificationCompletedAt: null,
      restoreValidatedAt: null,
      lastError: null,
      ...serverTimestamps(now),
    };
    await this.col().doc(input.id).set(doc);
    return input.id;
  }

  async getById(id: string) {
    const snap = await this.col().doc(id).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...(snap.data() as GymTenantBackupJobDoc) };
  }

  async patch(id: string, patch: Partial<GymTenantBackupJobDoc>) {
    await this.col()
      .doc(id)
      .update({ ...patch, updatedAt: Timestamp.now() });
  }
}