import { COLLECTIONS } from "@/lib/firestore/collections";

/** Firestore collections deleted by exact `gymId` match during tenant purge. */
export const GYM_TENANT_FIRESTORE_COLLECTIONS = [
  COLLECTIONS.users,
  COLLECTIONS.members,
  COLLECTIONS.packages,
  COLLECTIONS.subscriptions,
  COLLECTIONS.payments,
  COLLECTIONS.receipts,
  COLLECTIONS.visitors,
  COLLECTIONS.employees,
  COLLECTIONS.events,
  COLLECTIONS.customExercises,
  COLLECTIONS.workoutPlans,
  COLLECTIONS.workoutSessions,
  COLLECTIONS.memberPersonalWorkouts,
  COLLECTIONS.dietPlans,
  COLLECTIONS.attendance,
  COLLECTIONS.nutritionLogs,
  COLLECTIONS.nutritionMemberFoods,
  COLLECTIONS.nutritionMemberSettings,
  COLLECTIONS.cardioSessions,
  COLLECTIONS.memberGoals,
  COLLECTIONS.memberWaterLogs,
  COLLECTIONS.memberWeightMeasurements,
  COLLECTIONS.memberPortalDashboardState,
  COLLECTIONS.gymNotificationSettings,
  COLLECTIONS.notificationDeliveries,
  COLLECTIONS.ledgerTransactions,
] as const;

/** Platform/global collections that must never be bulk-deleted in a gym purge. */
export const GYM_PURGE_NEVER_DELETE_COLLECTIONS = [
  COLLECTIONS.exerciseCatalog,
  COLLECTIONS.nutritionFoodCatalog,
  COLLECTIONS.catalogSyncMeta,
  COLLECTIONS.catalogImportLocks,
  COLLECTIONS.staffLoginThrottles,
  COLLECTIONS.staffPasswordResetTokens,
  COLLECTIONS.staffPasswordResetRequestThrottles,
  COLLECTIONS.memberPortalInviteResendThrottles,
  COLLECTIONS.gyms,
  COLLECTIONS.gymProfiles,
] as const;

export type GymTenantInventory = {
  gymId: string;
  counts: Record<string, number>;
  totalDocuments: number;
};

export function gymSupabaseStoragePrefix(gymId: string): string {
  return `gyms/${gymId}/`;
}