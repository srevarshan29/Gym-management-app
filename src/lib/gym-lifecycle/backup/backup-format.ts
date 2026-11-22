export const TENANT_BACKUP_FORMAT_VERSION = 1 as const;

export type TenantBackupArtifactEntry = {
  path: string;
  checksumSha256: string;
  sizeBytes: number;
  recordCount: number;
  contentType: string;
};

export type TenantBackupFirestoreIntegrityV1 = {
  fingerprintAlgorithm: "sha256-canonical-v1";
  documentCount: number;
  verifiedAt: string;
};

export type TenantBackupManifestV1 = {
  formatVersion: typeof TENANT_BACKUP_FORMAT_VERSION;
  backupId: string;
  gymId: string;
  deletionJobId: string | null;
  gymName: string;
  createdAt: string;
  completedAt: string | null;
  inventoryCounts: Record<string, number>;
  artifacts: TenantBackupArtifactEntry[];
  manifestChecksumSha256: string | null;
  firestoreIntegrity?: TenantBackupFirestoreIntegrityV1 | null;
};

export type TenantBackupJobPhase =
  | "inventory"
  | "firestore"
  | "supabase"
  | "postgres"
  | "financial"
  | "manifest"
  | "verify"
  | "restore_validate"
  | "completed"
  | "failed";

export function backupObjectPrefix(gymId: string, backupId: string): string {
  return `tenant-backups/${gymId}/${backupId}/`;
}