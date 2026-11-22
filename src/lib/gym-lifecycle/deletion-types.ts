import type { Timestamp } from "firebase-admin/firestore";

export type GymDeletionMode = "scheduled" | "immediate";

export type GymPurgeStatus =
  | "none"
  | "scheduled_pending"
  | "backup_pending"
  | "ready"
  | "purging"
  | "completed"
  | "failed"
  | "cancelled";

export type GymBackupStatus = "pending" | "succeeded" | "failed";

export type GymPurgePhase =
  | "precheck"
  | "financial_archive"
  | "firestore_tenant"
  | "supabase_storage"
  | "postgres_tenant"
  | "gym_root";

export type GymPurgeProgress = {
  phase: GymPurgePhase;
  /** Opaque cursor within the current phase (collection name, doc id, etc.). */
  cursor?: string | null;
  completedPhases?: GymPurgePhase[];
};

export type GymDeletionLifecycleFields = {
  deletionMode?: GymDeletionMode | null;
  deletionRequestedAt?: Timestamp | null;
  deletionRequestedByUserId?: string | null;
  deletionEligibleAt?: Timestamp | null;
  deletionLockedAt?: Timestamp | null;
  purgeStatus?: GymPurgeStatus;
  backupStatus?: GymBackupStatus;
  backupArtifactRef?: string | null;
  backupChecksum?: string | null;
  backupSizeBytes?: number | null;
  backupCreatedAt?: Timestamp | null;
  purgeJobId?: string | null;
  purgeStartedAt?: Timestamp | null;
  purgeCompletedAt?: Timestamp | null;
  purgeProgress?: GymPurgeProgress | null;
  purgeError?: string | null;
};

export const GYM_DELETION_WAITING_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;