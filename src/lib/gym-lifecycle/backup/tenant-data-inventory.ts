import { COLLECTIONS } from "@/lib/firestore/collections";

/** Collections that must never appear in a tenant backup export. */
export const TENANT_BACKUP_PLATFORM_EXCLUDE = new Set<string>([
  COLLECTIONS.exerciseCatalog,
  COLLECTIONS.nutritionFoodCatalog,
  COLLECTIONS.catalogSyncMeta,
  COLLECTIONS.catalogImportLocks,
  COLLECTIONS.staffLoginThrottles,
  COLLECTIONS.staffPasswordResetTokens,
  COLLECTIONS.staffPasswordResetRequestThrottles,
  COLLECTIONS.memberPortalInviteResendThrottles,
  COLLECTIONS.gymDeletionJobs,
  COLLECTIONS.gymLifecycleAudit,
  COLLECTIONS.gymFinancialArchives,
  COLLECTIONS.gymTenantBackupJobs,
]);

/** Top-level docs keyed by gym id (document id === gymId). */
export const TENANT_BACKUP_GYM_ROOT_DOCS = [
  { collection: COLLECTIONS.gyms, kind: "gym_root" as const },
  { collection: COLLECTIONS.gymProfiles, kind: "gym_root" as const },
  { collection: COLLECTIONS.gymNotificationSettings, kind: "gym_doc_id" as const },
] as const;

/** Financial collections requiring complete archive shards. */
export const TENANT_FINANCIAL_COLLECTIONS = [
  COLLECTIONS.payments,
  COLLECTIONS.receipts,
  COLLECTIONS.subscriptions,
  COLLECTIONS.ledgerTransactions,
] as const;

/**
 * Tenant-owned Firestore collections (from COLLECTIONS registry).
 * Derived from project inventory — not a hand-maintained partial list.
 */
export function deriveTenantGymIdCollections(): readonly string[] {
  const all = Object.values(COLLECTIONS);
  const roots = new Set<string>(TENANT_BACKUP_GYM_ROOT_DOCS.map((r) => r.collection));
  return all.filter(
    (name) => !TENANT_BACKUP_PLATFORM_EXCLUDE.has(name) && !roots.has(name),
  );
}

export const TENANT_GYM_ID_COLLECTIONS = deriveTenantGymIdCollections();

export type TenantBackupInventoryCounts = {
  firestore: Record<string, number>;
  firestoreTotal: number;
};

export function assertCollectionAllowedForTenantBackup(collection: string): void {
  if (TENANT_BACKUP_PLATFORM_EXCLUDE.has(collection)) {
    throw new Error(`Collection ${collection} is excluded from tenant backup.`);
  }
}