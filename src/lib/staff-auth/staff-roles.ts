import type { StaffRole } from "@/lib/firestore/types";

export const GYM_STAFF_ROLES = ["OWNER", "ADMIN", "STAFF"] as const;

export type GymStaffRole = (typeof GYM_STAFF_ROLES)[number];

export function isGymStaffRole(role: StaffRole): role is GymStaffRole {
  return role === "OWNER" || role === "ADMIN" || role === "STAFF";
}

/** Staff password sign-in is retired; all staff roles use Google OAuth. */
export function credentialsPasswordLoginAllowed(_role: StaffRole): boolean {
  return false;
}

/** Staff Google OAuth for gym-scoped roles and platform SUPER_ADMIN. */
export function staffGoogleSignInRoleAllowed(role: StaffRole): boolean {
  return isGymStaffRole(role) || role === "SUPER_ADMIN";
}

/** Self-service password reset is disabled; staff use Google OAuth only. */
export function staffPasswordResetRoleAllowed(_role: StaffRole): boolean {
  return false;
}