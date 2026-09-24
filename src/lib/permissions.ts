import type { ExerciseSource } from "@/lib/exercises/catalog-types";
import {
  resolveExerciseSource,
  type ExerciseSourceInput,
} from "@/lib/exercises/source";
import type { Role } from "@prisma/client";

/**
 * Central role-based permission helpers.
 * Server-side checks are the source of truth; the UI mirrors these to hide controls.
 */

/** Gym-wide revenue aggregates, payment history reports, dashboard financial cards. */
export function canViewFinancials(role: Role | undefined | null): boolean {
  return role === "OWNER";
}

/** Manual ledger on Accounts & Finance (same sensitivity as gym-wide financials). */
export function canManageLedger(role: Role | undefined | null): boolean {
  return canViewFinancials(role);
}

/** Record a payment against a member (Owner, Admin, Staff). */
export function canLogPayments(role: Role | undefined | null): boolean {
  return role === "OWNER" || role === "ADMIN" || role === "STAFF";
}

/**
 * Per-member subs/paid/pending context needed to collect dues — operational data,
 * not gym-wide financial reporting. Same roles as canLogPayments.
 */
export function canViewMemberBalances(role: Role | undefined | null): boolean {
  return canLogPayments(role);
}

/** Forgive remaining subscription dues without recording a payment. Owner only. */
export function canWriteOffDues(role: Role | undefined | null): boolean {
  return canViewFinancials(role);
}

export function canDeleteMembers(role: Role | undefined | null): boolean {
  return role === "OWNER";
}

export function canManageStaff(role: Role | undefined | null): boolean {
  return role === "OWNER";
}

export function canManagePackages(role: Role | undefined | null): boolean {
  return role === "OWNER" || role === "ADMIN";
}

/** HR employee records (salary optional). Owner and Admin only. */
export function canManageEmployees(role: Role | undefined | null): boolean {
  return canManagePackages(role);
}

/** Gym events (workshops, open houses). Owner, Admin, and Staff. */
export function canManageEvents(role: Role | undefined | null): boolean {
  return canManageMembers(role);
}

/** CSV reports (bulk export). Owner and Admin only. */
export function canExportReports(role: Role | undefined | null): boolean {
  return canManageEmployees(role);
}

export function canManageMembers(role: Role | undefined | null): boolean {
  return role === "OWNER" || role === "ADMIN" || role === "STAFF";
}

/** Browse master exercise catalog (read-only preview). Owner, Admin, and Staff. */
export function canBrowseExerciseCatalog(role: Role | undefined | null): boolean {
  return canManageMembers(role);
}

/** Import exercises from master catalog. Owner and Admin only. */
export function canImportExerciseCatalog(role: Role | undefined | null): boolean {
  return role === "OWNER" || role === "ADMIN";
}

/** Upload exercise demonstration media. Owner and Admin only. */
export function canUploadExerciseMedia(role: Role | undefined | null): boolean {
  return role === "OWNER" || role === "ADMIN";
}

/** Gym-owned custom exercises only; catalog and starter exercises stay read-only. */
export function canUploadExerciseMediaForExercise(
  role: Role | undefined | null,
  exercise: {
    isSeeded: boolean;
    exerciseSource: ExerciseSource;
    catalogId?: string | null;
  },
): boolean {
  if (!canUploadExerciseMedia(role)) return false;
  return isCustomExerciseMediaUploadTarget(exercise);
}

export function isCustomExerciseMediaUploadTarget(exercise: {
  isSeeded: boolean;
  exerciseSource: ExerciseSource;
  catalogId?: string | null;
}): boolean {
  if (exercise.isSeeded) return false;
  if (exercise.catalogId?.trim()) return false;
  if (exercise.exerciseSource === "CATALOG") return false;
  return true;
}

/** Add custom exercises to the gym library. Owner, Admin, and Staff. */
export function canManageExerciseLibrary(role: Role | undefined | null): boolean {
  return canManageMembers(role);
}

export type ExerciseLibraryPermissionInput = ExerciseSourceInput & {
  catalogId?: string | null;
};

/** True when a gym exercise is linked to the platform catalog (import lock or legacy link). */
export function isCatalogLinkedExercise(
  exercise: ExerciseLibraryPermissionInput,
): boolean {
  if (exercise.catalogId?.trim()) {
    return true;
  }
  return resolveExerciseSource(exercise) === "CATALOG";
}

/**
 * Edit gym library defaults. Custom exercises: Owner/Admin/Staff.
 * Catalog imports: Owner/Admin only (metadata stays platform-managed).
 */
export function canEditExerciseDefaults(
  role: Role | undefined | null,
  exercise: ExerciseLibraryPermissionInput,
): boolean {
  if (!canManageExerciseLibrary(role)) return false;
  if (resolveExerciseSource(exercise) === "SEEDED") return false;
  if (isCatalogLinkedExercise(exercise)) {
    return canImportExerciseCatalog(role);
  }
  return true;
}

/**
 * Remove a gym library exercise. Custom exercises: Owner/Admin/Staff.
 * Catalog imports: Owner/Admin only (also clears import lock).
 */
export function canDeleteLibraryExercise(
  role: Role | undefined | null,
  exercise: ExerciseLibraryPermissionInput,
): boolean {
  if (!canManageExerciseLibrary(role)) return false;
  if (resolveExerciseSource(exercise) === "SEEDED") return false;
  if (isCatalogLinkedExercise(exercise)) {
    return canImportExerciseCatalog(role);
  }
  return true;
}
