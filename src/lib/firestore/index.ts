import { getFirestoreDb } from "@/lib/firebase/admin";
import { createRepositories, type FirestoreRepositories } from "@/lib/firestore/repositories";

export { getFirestoreDb, getFirebaseApp, isFirestoreEmulator } from "@/lib/firebase/admin";
export { COLLECTIONS } from "@/lib/firestore/collections";
export type * from "@/lib/firestore/types";
export {
  assertMemberSelfAccess,
  assertTenantAccess,
  requireGymId,
  type FirestoreContext,
  type MemberContext,
  type PlatformContext,
  type StaffContext,
  type SuperAdminContext,
} from "@/lib/firestore/context";
export {
  nullishString,
  omitUndefined,
  serverTimestamps,
  touchUpdatedAt,
} from "@/lib/firestore/serialize";
export {
  DocumentNotFoundError,
  TenantIsolationError,
  isFirestoreNotFound,
} from "@/lib/firestore/errors";
export {
  createRepositories,
  CustomExercisesRepository,
  DietPlansRepository,
  EmployeesRepository,
  EventsRepository,
  GymProfilesRepository,
  GymsRepository,
  MembersRepository,
  PackagesRepository,
  PaymentsRepository,
  ReceiptsRepository,
  StaffLoginThrottlesRepository,
  SubscriptionsRepository,
  UsersRepository,
  VisitorsRepository,
  WorkoutPlansRepository,
  WorkoutSessionsRepository,
  TenantRepository,
  clampPageSize,
  type DocWithId,
  type FirestoreRepositories,
  type PaginatedResult,
} from "@/lib/firestore/repositories";
export { adjustGymCounter, PHASE3_GYM_COUNTERS, type GymCounterField, type Phase3GymCounter } from "@/lib/firestore/gym-counters";
export { displayNamesEqual, newDocId, platformContext } from "@/lib/firestore/helpers";
export {
  convertVisitorRecord,
  createQrRegistrationVisitor,
  createWalkInVisitor,
  deleteVisitorRecord,
} from "@/lib/firestore/visitor-operations";
export {
  createDietPlanRecord,
  deleteDietPlanForMember,
  deleteDietPlanRecord,
} from "@/lib/firestore/diet-plan-operations";
export {
  adjustPtMemberCounter,
  ptMemberCounterDelta,
} from "@/lib/firestore/pt-member-counter";
export {
  createEmployeeRecord,
  deleteEmployeeRecord,
} from "@/lib/firestore/employee-operations";
export {
  createEventRecord,
  deleteEventRecord,
} from "@/lib/firestore/event-operations";
export {
  buildEmbeddedPlanDays,
  deleteWorkoutPlanForMember,
  deleteWorkoutPlanRecord,
  saveWorkoutPlanRecord,
} from "@/lib/firestore/workout-plan-operations";
export {
  completeWorkoutSessionRecord,
  logWorkoutSetRecord,
  startWorkoutSessionRecord,
} from "@/lib/firestore/workout-session-operations";
export {
  createMemberWithSubscription,
  logPaymentWithReceipt,
  renewWithSubscription,
  writeOffSubscriptionInTransaction,
} from "@/lib/firestore/billing/operations";

let cachedRepos: FirestoreRepositories | undefined;

/** Singleton repositories bag (server-side only). */
export function getRepositories(): FirestoreRepositories {
  if (!cachedRepos) {
    cachedRepos = createRepositories(getFirestoreDb());
  }
  return cachedRepos;
}
