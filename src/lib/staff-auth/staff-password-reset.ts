import { nextCredentialsVersion } from "@/lib/staff-auth/credentials-version";

/** bcryptjs only uses the first 72 bytes of a password. */
export const STAFF_PASSWORD_MAX_BYTES = 72;
export const STAFF_PASSWORD_MIN_LENGTH = 8;
export const STAFF_PASSWORD_BCRYPT_ROUNDS = 10;

export class StaffPasswordResetError extends Error {
  override readonly name = "StaffPasswordResetError";

  constructor(message: string) {
    super(message);
  }
}

export type StaffPasswordResetAccount = {
  id: string;
  email: string;
  gymId: string | null;
  role: string;
};

export function assertExactlyOneStaffAccount<T extends StaffPasswordResetAccount>(
  matches: readonly T[],
): T {
  if (matches.length === 0) {
    throw new StaffPasswordResetError("No staff account matches that email.");
  }
  if (matches.length > 1) {
    throw new StaffPasswordResetError(
      "Multiple staff accounts match that email. Refusing to continue.",
    );
  }
  return matches[0]!;
}

/** Returns an error message, or null when the password is acceptable. */
export function validateStaffResetPassword(password: string): string | null {
  if (password.length < STAFF_PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${STAFF_PASSWORD_MIN_LENGTH} characters.`;
  }
  if (Buffer.byteLength(password, "utf8") > STAFF_PASSWORD_MAX_BYTES) {
    return `Password must be at most ${STAFF_PASSWORD_MAX_BYTES} bytes.`;
  }
  return null;
}

export function assertStaffPasswordResetConfirmation(input: {
  email: string;
  projectId: string;
  gymId: string | null;
  confirmEmail: string;
  confirmProjectId: string;
  confirmGymId: string;
}): void {
  if (!input.gymId) {
    throw new StaffPasswordResetError(
      "This account has no gym ID. Refusing to reset the password.",
    );
  }
  if (input.confirmEmail !== input.email) {
    throw new StaffPasswordResetError("Email confirmation does not match.");
  }
  if (input.confirmProjectId !== input.projectId) {
    throw new StaffPasswordResetError(
      "Firebase project confirmation does not match.",
    );
  }
  if (input.confirmGymId !== input.gymId) {
    throw new StaffPasswordResetError("Gym ID confirmation does not match.");
  }
}

/** Fields allowed when an existing staff password is reset via the ops CLI. */
export function staffPasswordResetPatch(input: {
  passwordHash: string;
  updatedAt: Date;
  currentCredentialsVersion?: unknown;
}): { passwordHash: string; updatedAt: Date; credentialsVersion: number } {
  return {
    passwordHash: input.passwordHash,
    updatedAt: input.updatedAt,
    credentialsVersion: nextCredentialsVersion(input.currentCredentialsVersion),
  };
}
