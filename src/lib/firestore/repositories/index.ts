import type { Firestore } from "firebase-admin/firestore";

import { CustomExercisesRepository } from "@/lib/firestore/repositories/custom-exercises";
import { DietPlansRepository } from "@/lib/firestore/repositories/diet-plans";
import { EmployeesRepository } from "@/lib/firestore/repositories/employees";
import { EventsRepository } from "@/lib/firestore/repositories/events";
import { GymProfilesRepository } from "@/lib/firestore/repositories/gym-profiles";
import { GymsRepository } from "@/lib/firestore/repositories/gyms";
import { MembersRepository } from "@/lib/firestore/repositories/members";
import { PackagesRepository } from "@/lib/firestore/repositories/packages";
import { PaymentsRepository } from "@/lib/firestore/repositories/payments";
import { ReceiptsRepository } from "@/lib/firestore/repositories/receipts";
import { StaffLoginThrottlesRepository } from "@/lib/firestore/repositories/staff-login-throttles";
import { SubscriptionsRepository } from "@/lib/firestore/repositories/subscriptions";
import { UsersRepository } from "@/lib/firestore/repositories/users";
import { VisitorsRepository } from "@/lib/firestore/repositories/visitors";
import { WorkoutPlansRepository } from "@/lib/firestore/repositories/workout-plans";
import { WorkoutSessionsRepository } from "@/lib/firestore/repositories/workout-sessions";

export type FirestoreRepositories = {
  gyms: GymsRepository;
  gymProfiles: GymProfilesRepository;
  users: UsersRepository;
  members: MembersRepository;
  packages: PackagesRepository;
  subscriptions: SubscriptionsRepository;
  payments: PaymentsRepository;
  receipts: ReceiptsRepository;
  staffLoginThrottles: StaffLoginThrottlesRepository;
  visitors: VisitorsRepository;
  employees: EmployeesRepository;
  events: EventsRepository;
  dietPlans: DietPlansRepository;
  customExercises: CustomExercisesRepository;
  workoutPlans: WorkoutPlansRepository;
  workoutSessions: WorkoutSessionsRepository;
};

export function createRepositories(db: Firestore): FirestoreRepositories {
  return {
    gyms: new GymsRepository(db),
    gymProfiles: new GymProfilesRepository(db),
    users: new UsersRepository(db),
    members: new MembersRepository(db),
    packages: new PackagesRepository(db),
    subscriptions: new SubscriptionsRepository(db),
    payments: new PaymentsRepository(db),
    receipts: new ReceiptsRepository(db),
    staffLoginThrottles: new StaffLoginThrottlesRepository(db),
    visitors: new VisitorsRepository(db),
    employees: new EmployeesRepository(db),
    events: new EventsRepository(db),
    dietPlans: new DietPlansRepository(db),
    customExercises: new CustomExercisesRepository(db),
    workoutPlans: new WorkoutPlansRepository(db),
    workoutSessions: new WorkoutSessionsRepository(db),
  };
}

export { CustomExercisesRepository } from "@/lib/firestore/repositories/custom-exercises";
export { DietPlansRepository } from "@/lib/firestore/repositories/diet-plans";
export { EmployeesRepository } from "@/lib/firestore/repositories/employees";
export { EventsRepository } from "@/lib/firestore/repositories/events";
export { GymProfilesRepository } from "@/lib/firestore/repositories/gym-profiles";
export { GymsRepository } from "@/lib/firestore/repositories/gyms";
export { MembersRepository } from "@/lib/firestore/repositories/members";
export { PackagesRepository } from "@/lib/firestore/repositories/packages";
export { PaymentsRepository } from "@/lib/firestore/repositories/payments";
export { ReceiptsRepository } from "@/lib/firestore/repositories/receipts";
export { StaffLoginThrottlesRepository } from "@/lib/firestore/repositories/staff-login-throttles";
export { SubscriptionsRepository } from "@/lib/firestore/repositories/subscriptions";
export { UsersRepository } from "@/lib/firestore/repositories/users";
export { VisitorsRepository } from "@/lib/firestore/repositories/visitors";
export { WorkoutPlansRepository } from "@/lib/firestore/repositories/workout-plans";
export { WorkoutSessionsRepository } from "@/lib/firestore/repositories/workout-sessions";
export {
  TenantRepository,
  clampPageSize,
  type DocWithId,
  type PaginatedResult,
} from "@/lib/firestore/repositories/base";
