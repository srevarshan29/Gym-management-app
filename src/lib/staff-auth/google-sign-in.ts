import { gymAllowsTenantAccess } from "@/lib/gym-lifecycle/status";
import { staffGoogleSignInRoleAllowed } from "@/lib/staff-auth/staff-roles";
import type { GymDoc, StaffRole } from "@/lib/firestore/types";

export type StaffGoogleSignInRejectionReason =
  | "unverified_email"
  | "user_not_found"
  | "email_mismatch"
  | "role_not_allowed"
  | "missing_gym"
  | "gym_inactive"
  | "gym_not_found";

export type StaffGoogleSignInUser = {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  gymId: string | null;
  credentialsVersion?: number;
};

export type StaffGoogleSignInResult =
  | {
      ok: true;
      user: StaffGoogleSignInUser;
    }
  | { ok: false; reason: StaffGoogleSignInRejectionReason };

export function normalizeStaffGoogleEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Verified Google identity must match the persisted staff account email. */
export function staffGoogleEmailMatchesAccount(
  googleEmail: string,
  accountEmail: string,
): boolean {
  return (
    normalizeStaffGoogleEmail(googleEmail) === normalizeStaffGoogleEmail(accountEmail)
  );
}

function evaluateSuperAdminGoogleSignIn(input: {
  emailVerified: boolean;
  googleEmail: string;
  user: StaffGoogleSignInUser;
}): StaffGoogleSignInResult {
  if (!input.emailVerified) {
    return { ok: false, reason: "unverified_email" };
  }
  if (input.user.role !== "SUPER_ADMIN") {
    return { ok: false, reason: "role_not_allowed" };
  }
  if (!staffGoogleEmailMatchesAccount(input.googleEmail, input.user.email)) {
    return { ok: false, reason: "email_mismatch" };
  }
  return { ok: true, user: input.user };
}

function evaluateGymStaffGoogleSignIn(input: {
  emailVerified: boolean;
  googleEmail: string;
  user: StaffGoogleSignInUser;
  gym: Pick<GymDoc, "status"> | null;
}): StaffGoogleSignInResult {
  if (!input.emailVerified) {
    return { ok: false, reason: "unverified_email" };
  }
  if (!staffGoogleSignInRoleAllowed(input.user.role)) {
    return { ok: false, reason: "role_not_allowed" };
  }
  if (!staffGoogleEmailMatchesAccount(input.googleEmail, input.user.email)) {
    return { ok: false, reason: "email_mismatch" };
  }
  if (!input.user.gymId) {
    return { ok: false, reason: "missing_gym" };
  }
  if (!input.gym) {
    return { ok: false, reason: "gym_not_found" };
  }
  if (!gymAllowsTenantAccess(input.gym)) {
    return { ok: false, reason: "gym_inactive" };
  }
  return { ok: true, user: input.user };
}

export function evaluateStaffGoogleSignIn(input: {
  emailVerified: boolean;
  googleEmail: string;
  user: StaffGoogleSignInUser | null;
  gym: Pick<GymDoc, "status"> | null;
}): StaffGoogleSignInResult {
  if (!input.emailVerified) {
    return { ok: false, reason: "unverified_email" };
  }
  if (!input.user) {
    return { ok: false, reason: "user_not_found" };
  }

  if (input.user.role === "SUPER_ADMIN") {
    return evaluateSuperAdminGoogleSignIn({
      emailVerified: input.emailVerified,
      googleEmail: input.googleEmail,
      user: input.user,
    });
  }

  return evaluateGymStaffGoogleSignIn({
    emailVerified: input.emailVerified,
    googleEmail: input.googleEmail,
    user: input.user,
    gym: input.gym,
  });
}

/** @deprecated Use evaluateStaffGoogleSignIn */
export const evaluateStaffGoogleOwnerSignIn = evaluateStaffGoogleSignIn;

export function isStaffGoogleSignInConfigured(): boolean {
  return !!(
    process.env.STAFF_AUTH_GOOGLE_CLIENT_ID &&
    process.env.STAFF_AUTH_GOOGLE_CLIENT_SECRET
  );
}