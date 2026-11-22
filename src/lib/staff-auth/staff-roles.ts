import type { StaffRole } from "@/lib/firestore/types";

export const GYM_STAFF_ROLES = ["OWNER", "ADMIN", "STAFF"] as const;

export type GymStaffRole = (typeof GYM_STAFF_ROLES)[number];

export function isGymStaffRole(role: StaffRole): role is GymStaffRole {
  return role === "OWNER" || role === "ADMIN" || role === "STAFF";
}

/** Password credentials are only for platform SUPER_ADMIN accounts. */
export function credentialsPasswordLoginAllowed(role: StaffRole): boolean {
  return role === "SUPER_ADMIN";
}

/** Staff Google OAuth for gym-scoped roles and platform SUPER_ADMIN. */
export function staffGoogleSignInRoleAllowed(role: StaffRole): boolean {
  return isGymStaffRole(role) || role === "SUPER_ADMIN";
}

/** Self-service password reset is only for SUPER_ADMIN. */
export function staffPasswordResetRoleAllowed(role: StaffRole): boolean {
  return role === "SUPER_ADMIN";
}