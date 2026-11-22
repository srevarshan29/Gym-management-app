import { Timestamp, type Firestore } from "firebase-admin/firestore";

import { COLLECTIONS } from "@/lib/firestore/collections";
import type { GymDeletionMode, GymPurgeProgress, GymPurgeStatus } from "@/lib/firestore/types";
import { omitUndefined, serverTimestamps } from "@/lib/firestore/serialize";

export type GymDeletionJobDoc = {
  gymId: string;
  gymName: string;
  deletionMode: GymDeletionMode;
  purgeStatus: GymPurgeStatus;
  requestedByUserId: string;
  requestedAt: Timestamp;
  eligibleAt: Timestamp | null;
  lockedAt: Timestamp | null;
  backupArtifactRef: string | null;
  backupChecksum: string | null;
  purgeConfirmedAt: Timestamp | null;
  purgeConfirmedByUserId: string | null;
  purgeLeaseOwner: string | null;
  purgeLeaseExpiresAt: Timestamp | null;
  progress: GymPurgeProgress | null;
  purgeError: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export class GymDeletionJobsRepository {
  constructor(private readonly db: Firestore) {}

  private col() {
    return this.db.collection(COLLECTIONS.gymDeletionJobs);
  }

  async create(input: {
    id: string;
    gymId: string;
    gymName: string;
    deletionMode: GymDeletionMode;
    purgeStatus: GymPurgeStatus;
    requestedByUserId: string;
    requestedAt: Date;
    eligibleAt: Date | null;
    lockedAt: Date | null;
  }) {
    const now = Timestamp.now();
    const data = omitUndefined({
      gymId: input.gymId,
      gymName: input.gymName,
      deletionMode: input.deletionMode,
      purgeStatus: input.purgeStatus,
      requestedByUserId: input.requestedByUserId,
      requestedAt: Timestamp.fromDate(input.requestedAt),
      eligibleAt: input.eligibleAt ? Timestamp.fromDate(input.eligibleAt) : null,
      lockedAt: input.lockedAt ? Timestamp.fromDate(input.lockedAt) : null,
      backupArtifactRef: null,
      backupChecksum: null,
      purgeConfirmedAt: null,
      purgeConfirmedByUserId: null,
      purgeLeaseOwner: null,
      purgeLeaseExpiresAt: null,
      progress: null,
      purgeError: null,
      ...serverTimestamps(now),
    }) satisfies Omit<GymDeletionJobDoc, "createdAt" | "updatedAt"> & {
      createdAt: Timestamp;
      updatedAt: Timestamp;
    };
    await this.col().doc(input.id).set(data);
    return input.id;
  }

  async getById(jobId: string) {
    const snap = await this.col().doc(jobId).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...(snap.data() as GymDeletionJobDoc) };
  }

  async getByGymId(gymId: string) {
    const snap = await this.col().where("gymId", "==", gymId).limit(1).get();
    const doc = snap.docs[0];
    if (!doc) return null;
    return { id: doc.id, ...(doc.data() as GymDeletionJobDoc) };
  }

  async patch(
    jobId: string,
    patch: Partial<
      Pick<
        GymDeletionJobDoc,
        | "purgeStatus"
        | "backupArtifactRef"
        | "backupChecksum"
        | "purgeConfirmedAt"
        | "purgeConfirmedByUserId"
        | "purgeLeaseOwner"
        | "purgeLeaseExpiresAt"
        | "progress"
        | "purgeError"
      >
    > &
      Record<string, unknown>,
  ) {
    await this.col()
      .doc(jobId)
      .update({
        ...patch,
        updatedAt: Timestamp.now(),
      });
  }

  async recordPurgeConfirmation(
    jobId: string,
    input: { gymId: string; actorUserId: string; deletionMode: GymDeletionJobDoc["deletionMode"] },
  ): Promise<void> {
    const ref = this.col().doc(jobId);
    await this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) {
        throw new Error("Deletion job not found.");
      }
      const job = snap.data() as GymDeletionJobDoc;
      if (job.gymId !== input.gymId) {
        throw new Error("Confirmation job does not match gym.");
      }
      if (job.deletionMode !== input.deletionMode) {
        throw new Error("Confirmation job deletion mode mismatch.");
      }
      if (job.purgeConfirmedAt) {
        throw new Error("This deletion job was already confirmed.");
      }
      if (job.purgeStatus === "cancelled" || job.purgeStatus === "completed") {
        throw new Error("Cannot confirm a cancelled or completed job.");
      }
      tx.update(ref, {
        purgeConfirmedAt: Timestamp.now(),
        purgeConfirmedByUserId: input.actorUserId,
        purgeStatus: "ready",
        updatedAt: Timestamp.now(),
      });
    });
  }
}