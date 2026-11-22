import { Timestamp, type Firestore } from "firebase-admin/firestore";

import { COLLECTIONS } from "@/lib/firestore/collections";
import type { GymPurgeProgress } from "@/lib/firestore/types";

export const PURGE_JOB_LEASE_MS = 5 * 60 * 1000;

export type PurgeJobLeaseDoc = {
  purgeLeaseOwner?: string | null;
  purgeLeaseExpiresAt?: Timestamp | null;
};

export type AcquireLeaseResult =
  | { acquired: true; leaseOwner: string; leaseExpiresAt: Timestamp }
  | { acquired: false; reason: string };

export async function acquirePurgeJobLease(
  db: Firestore,
  jobId: string,
  owner: string,
  now = Date.now(),
): Promise<AcquireLeaseResult> {
  const ref = db.collection(COLLECTIONS.gymDeletionJobs).doc(jobId);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      return { acquired: false, reason: "Deletion job not found." };
    }

    const data = snap.data() as PurgeJobLeaseDoc;
    const expires = data.purgeLeaseExpiresAt?.toMillis() ?? 0;
    const activeOwner = data.purgeLeaseOwner;

    if (activeOwner && activeOwner !== owner && expires > now) {
      return { acquired: false, reason: "Another worker holds the purge lease." };
    }

    const leaseExpiresAt = Timestamp.fromMillis(now + PURGE_JOB_LEASE_MS);
    tx.update(ref, {
      purgeLeaseOwner: owner,
      purgeLeaseExpiresAt: leaseExpiresAt,
      updatedAt: Timestamp.now(),
    });

    return { acquired: true, leaseOwner: owner, leaseExpiresAt };
  });
}

export async function releasePurgeJobLease(
  db: Firestore,
  jobId: string,
  owner: string,
): Promise<void> {
  const ref = db.collection(COLLECTIONS.gymDeletionJobs).doc(jobId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;
    const data = snap.data() as PurgeJobLeaseDoc;
    if (data.purgeLeaseOwner !== owner) return;
    tx.update(ref, {
      purgeLeaseOwner: null,
      purgeLeaseExpiresAt: null,
      updatedAt: Timestamp.now(),
    });
  });
}

export async function commitPurgeProgressWithLease(
  db: Firestore,
  input: {
    jobId: string;
    leaseOwner: string;
    expected: GymPurgeProgress;
    next: GymPurgeProgress;
    batchSucceeded: boolean;
  },
): Promise<{ committed: boolean; reason?: string }> {
  if (!input.batchSucceeded) {
    return { committed: false, reason: "Batch did not complete successfully." };
  }

  const ref = db.collection(COLLECTIONS.gymDeletionJobs).doc(input.jobId);
  const now = Date.now();

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      return { committed: false, reason: "Job missing." };
    }

    const data = snap.data() as PurgeJobLeaseDoc & { progress?: GymPurgeProgress | null };
    const expires = data.purgeLeaseExpiresAt?.toMillis() ?? 0;
    if (data.purgeLeaseOwner !== input.leaseOwner || expires <= now) {
      return { committed: false, reason: "Lease is not held by this worker." };
    }

    const current = data.progress ?? { phase: input.expected.phase, cursor: null, completedPhases: [] };
    if (
      current.phase !== input.expected.phase ||
      (current.cursor ?? null) !== (input.expected.cursor ?? null)
    ) {
      return { committed: false, reason: "Progress cursor mismatch; refusing to advance." };
    }

    tx.update(ref, {
      progress: input.next,
      updatedAt: Timestamp.now(),
    });

    return { committed: true };
  });
}