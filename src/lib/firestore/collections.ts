/** Top-level Firestore collection names (single source of truth). */
export const COLLECTIONS = {
  gyms: "gyms",
  gymProfiles: "gymProfiles",
  users: "users",
  members: "members",
  packages: "packages",
  subscriptions: "subscriptions",
  payments: "payments",
  receipts: "receipts",
  visitors: "visitors",
  employees: "employees",
  events: "events",
  ledgerTransactions: "ledgerTransactions",
  customExercises: "customExercises",
  catalogImportLocks: "catalogImportLocks",
  exerciseCatalog: "exerciseCatalog",
  catalogSyncMeta: "catalogSyncMeta",
  workoutPlans: "workoutPlans",
  workoutSessions: "workoutSessions",
  dietPlans: "dietPlans",
  staffLoginThrottles: "staffLoginThrottles",
  nutritionLogs: "nutritionLogs",
  cardioSessions: "cardioSessions",
  memberGoals: "memberGoals",
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
