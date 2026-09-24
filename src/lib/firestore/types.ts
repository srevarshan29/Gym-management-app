import type { Timestamp } from "firebase-admin/firestore";

import type {
  ExerciseDifficulty,
  ExerciseMediaMetadata,
  ExerciseProviderMetadata,
  ExerciseSource,
} from "@/lib/exercises/catalog-types";
import type { MuscleGroup } from "@/lib/muscle-groups";
import type { VisitorStatus } from "@/lib/visitor-types";

export type {
  ExerciseDifficulty,
  ExerciseMediaMetadata,
  ExerciseProviderMetadata,
  ExerciseSource,
} from "@/lib/exercises/catalog-types";
export type { MuscleGroup } from "@/lib/muscle-groups";
export type { VisitorStatus, VisitorStatusFilter } from "@/lib/visitor-types";

export type StaffRole = "SUPER_ADMIN" | "OWNER" | "ADMIN" | "STAFF";
export type MemberRole = "MEMBER";

export type DurationUnit = "MONTHS" | "DAYS";
export type PaymentMethod =
  | "CASH"
  | "UPI"
  | "CARD"
  | "BANK_TRANSFER"
  | "OTHER";
export type MemberGender =
  | "MALE"
  | "FEMALE"
  | "OTHER"
  | "PREFER_NOT_TO_SAY";
export type FitnessGoal =
  | "WEIGHT_LOSS"
  | "MUSCLE_GAIN"
  | "GENERAL_FITNESS"
  | "STRENGTH_TRAINING"
  | "ENDURANCE";
export type VisitorSource = "walk_in" | "qr_registration";
export type LedgerTransactionType = "INCOME" | "EXPENSE";
export type WorkoutLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
export type WorkoutSessionStatus = "IN_PROGRESS" | "COMPLETED";
export type ExerciseTrackingType = "WEIGHTED" | "TIME" | "BODYWEIGHT";

// ── Base document fields ─────────────────────────────────────────────────

export type FirestoreTimestamps = {
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

/** Precomputed dashboard counters on the gym doc (updated on writes). */
export type GymDashboardCounters = {
  activeMembers: number;
  expiredMembers: number;
  expiringSoonMembers: number;
  pendingPaymentsCount: number;
  pendingPaymentsAmount: number;
  revenueThisMonth: number;
  newMembersThisMonth: number;
  /** Pending walk-in visitors (not QR, not converted). Phase 3. */
  pendingWalkInVisitors: number;
  employeeCount: number;
  eventCount: number;
  dietPlanCount: number;
  workoutPlanCount: number;
  ptMemberCount: number;
  countersUpdatedAt: Timestamp;
};

export type VisitorDoc = {
  gymId: string;
  name: string;
  phone: string;
  email: string | null;
  gender: MemberGender | null;
  visitDate: Timestamp;
  notes: string | null;
  status: VisitorStatus;
  source: VisitorSource;
  membershipPolicyAgreedText: string | null;
  membershipPolicyAgreedAt: Timestamp | null;
  fitnessGoal: FitnessGoal | null;
  ageYears: number | null;
  heightCm: number | null;
  weightKg: number | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type EmployeeDoc = {
  gymId: string;
  name: string;
  phone: string;
  position: string;
  joiningDate: Timestamp;
  salary: number | null;
  notes: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type EventDoc = {
  gymId: string;
  title: string;
  eventDate: Timestamp;
  location: string;
  description: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type CustomExerciseDoc = {
  gymId: string;
  name: string;
  /** Lowercase name for case-insensitive duplicate checks. */
  nameLower: string;
  muscleGroup: MuscleGroup;
  defaultSets: number | null;
  defaultReps: string | null;
  defaultTempo: string | null;
  defaultRestSeconds: number | null;
  trackingType: ExerciseTrackingType;
  isSeeded: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;

  /** Infer legacy source via resolveExerciseSource when absent. */
  exerciseSource?: ExerciseSource | null;
  catalogId?: string | null;
  importedCatalogVersion?: string | null;
  description?: string | null;
  instructions?: string[] | null;
  tips?: string[] | null;
  equipment?: string | null;
  bodyPart?: string | null;
  difficulty?: ExerciseDifficulty | null;
  movementPattern?: string | null;
  primaryMuscles?: string[] | null;
  secondaryMuscles?: string[] | null;
  safetyNotes?: string[] | null;
  media?: ExerciseMediaMetadata | null;
  provider?: ExerciseProviderMetadata | null;
  enrichedAt?: Timestamp | null;
};

/**
 * Platform-scoped master exercise catalog entry.
 * Document ID = catalogId slug. No gymId — not tenant-scoped.
 */
export type ExerciseCatalogDoc = {
  catalogId: string;
  name: string;
  /** Lowercase name for prefix search and sorting. */
  nameLower: string;
  muscleGroup: MuscleGroup;
  description: string | null;
  instructions: string[];
  tips: string[] | null;
  equipment: string | null;
  bodyPart: string | null;
  difficulty: ExerciseDifficulty | null;
  movementPattern: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[] | null;
  safetyNotes: string[] | null;
  category: string | null;
  isBodyweight: boolean;
  media: ExerciseMediaMetadata;
  provider: ExerciseProviderMetadata;
  catalogVersion: string;
  /** Prefix tokens (length >= 3) derived from name words for array-contains search. */
  searchPrefixes: string[];
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

// ── Core documents ─────────────────────────────────────────────────────

export type GymDoc = {
  name: string;
  slug: string | null;
  registrationToken: string;
  memberSeq: number;
  receiptSeq: number;
  dashboardCounters?: GymDashboardCounters;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type GymProfileDoc = {
  gymId: string;
  name: string;
  logoUrl: string | null;
  address: string | null;
  phone: string | null;
  ownerNotifyPhone: string | null;
  ownerNotifyEmail: string | null;
  membershipPolicyText: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type UserDoc = {
  gymId: string | null;
  name: string;
  email: string;
  passwordHash: string;
  role: StaffRole;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type MemberDoc = {
  gymId: string;
  memberNumber: number;
  name: string;
  /** Lowercase name for prefix queries. */
  nameLower: string;
  phone: string;
  /** Digits-only phone for search. */
  phoneDigits: string;
  /** Token array for staff directory search. */
  searchTokens: string[];
  email: string | null;
  photoUrl: string | null;
  gender: MemberGender;
  notes: string | null;
  isPt: boolean;
  trainerId: string | null;
  membershipPolicyAgreedText: string | null;
  membershipPolicyAgreedAt: Timestamp | null;
  portalEnabledAt: Timestamp | null;
  ageYears: number | null;
  heightCm: number | null;
  weightKg: number | null;
  fitnessGoal: FitnessGoal | null;
  /** Sum of pendingAmount across all subscription cycles. */
  pendingAmountTotal: number;
  currentSubscriptionId: string | null;
  currentStartDate: Timestamp | null;
  currentEndDate: Timestamp | null;
  currentPackageName: string | null;
  addedByName: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type PackageDoc = {
  gymId: string;
  name: string;
  price: number;
  durationValue: number;
  durationUnit: DurationUnit;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type SubscriptionDoc = {
  gymId: string;
  memberId: string;
  packageId: string;
  /** Denormalized for list views (avoids package join). */
  packageName: string;
  memberName: string;
  memberNumber: number;
  startDate: Timestamp;
  endDate: Timestamp;
  priceAtPurchase: number;
  paidTotal: number;
  pendingAmount: number;
  writtenOffAmount: number;
  writtenOffAt: Timestamp | null;
  writtenOffById: string | null;
  createdById: string | null;
  createdAt: Timestamp;
};

export type PaymentDoc = {
  gymId: string;
  memberId: string;
  subscriptionId: string | null;
  amount: number;
  method: PaymentMethod;
  paidAt: Timestamp;
  note: string | null;
  recordedById: string | null;
  createdAt: Timestamp;
};

export type ReceiptDoc = {
  gymId: string;
  number: number;
  paymentId: string;
  gymName: string;
  gymAddress: string | null;
  gymPhone: string | null;
  gymLogoUrl: string | null;
  memberId: string;
  memberName: string;
  memberPhone: string;
  memberEmail: string | null;
  packageName: string | null;
  amount: number;
  amountOwed: number | null;
  balanceAfter: number | null;
  method: PaymentMethod;
  paidAt: Timestamp;
  periodStart: Timestamp | null;
  periodEnd: Timestamp | null;
  createdAt: Timestamp;
};

// ── Embedded workout plan structure ──────────────────────────────────────

export type WorkoutPlanExerciseEmbedded = {
  id: string;
  exerciseId: string | null;
  customName: string | null;
  sortOrder: number;
  targetSets: number;
  targetReps: string;
  tempo: string | null;
  restSeconds: number | null;
  targetWeightKg: number | null;
  trackingTypeOverride: ExerciseTrackingType | null;
};

export type WorkoutPlanDayEmbedded = {
  id: string;
  label: string;
  sortOrder: number;
  exercises: WorkoutPlanExerciseEmbedded[];
};

export type WorkoutPlanDoc = {
  gymId: string;
  memberId: string;
  /** Denormalized for staff list sort (no member join). */
  memberName: string;
  title: string;
  durationWeeks: number | null;
  focusGoal: string | null;
  level: WorkoutLevel | null;
  weeklySchedule: string | null;
  days: WorkoutPlanDayEmbedded[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type WorkoutSetLogEmbedded = {
  setNumber: number;
  weightKg: number | null;
  durationSeconds: number | null;
  loggedAt: Timestamp;
};

export type WorkoutSessionExerciseEmbedded = {
  id: string;
  workoutPlanExerciseId: string;
  sortOrder: number;
  /** Snapshot of plan-row identity at session start (legacy sessions omit these). */
  exerciseId?: string | null;
  customName?: string | null;
  trackingTypeOverride?: ExerciseTrackingType | null;
  targetReps?: string;
  sets: WorkoutSetLogEmbedded[];
};

export type WorkoutSessionDoc = {
  gymId: string;
  memberId: string;
  workoutPlanId: string;
  workoutPlanDayId: string | null;
  status: WorkoutSessionStatus;
  startedAt: Timestamp;
  completedAt: Timestamp | null;
  durationSeconds: number | null;
  exercises: WorkoutSessionExerciseEmbedded[];
};

export type DietPlanDoc = {
  gymId: string;
  memberId: string;
  /** Denormalized for staff list sort (no member join). */
  memberName: string;
  title: string;
  caloriesPerDay: number;
  mealPlan: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

/** Every tenant-scoped document carries gymId. */
export type TenantDocument = { gymId: string };
