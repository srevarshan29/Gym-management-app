import { createHash, randomBytes } from "crypto";

import { getAppBaseUrl } from "@/lib/registration";
import {
  STAFF_PASSWORD_BCRYPT_ROUNDS,
  validateStaffResetPassword,
} from "@/lib/staff-auth/staff-password-reset";
import type { StaffPasswordResetTokenDoc } from "@/lib/firestore/repositories/staff-password-reset-tokens";
import type { RateLimitResult } from "@/lib/rate-limit";

export const STAFF_PASSWORD_RESET_TOKEN_BYTES = 32;
export const STAFF_PASSWORD_RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

export const STAFF_PASSWORD_RESET_GENERIC_SUCCESS_MESSAGE =
  "If an account exists for that email, you will receive password reset instructions shortly.";

export const STAFF_PASSWORD_RESET_RATE_LIMIT_MESSAGE =
  "Too many reset requests. Please try again later.";

export type StaffPasswordResetCompletionOutcome =
  | "success"
  | "invalid_token"
  | "expired_token"
  | "used_token"
  | "password_mismatch"
  | "validation_error";

export function generateStaffPasswordResetToken(): string {
  return randomBytes(STAFF_PASSWORD_RESET_TOKEN_BYTES).toString("base64url");
}

export function hashStaffPasswordResetToken(rawToken: string): string {
  const trimmed = rawToken.trim();
  return createHash("sha256").update(trimmed, "utf8").digest("hex");
}

export function buildStaffPasswordResetUrl(
  baseUrl: string,
  rawToken: string,
): string {
  const url = new URL("/reset-password", baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  url.searchParams.set("token", rawToken);
  return url.toString();
}

export function staffPasswordResetExpiresAt(now: Date): Date {
  return new Date(now.getTime() + STAFF_PASSWORD_RESET_TOKEN_TTL_MS);
}

export type StaffAccountForReset = {
  id: string;
  email: string;
  gymId: string | null;
};

export type StaffPasswordResetRequestDeps = {
  now?: Date;
  findStaffAccountsByEmail: (email: string) => Promise<StaffAccountForReset[]>;
  consumeRequestAllowance: () => Promise<RateLimitResult>;
  createResetToken: (input: {
    tokenHash: string;
    userId: string;
    email: string;
    gymId: string | null;
    expiresAt: Date;
    createdAt: Date;
  }) => Promise<void>;
  sendResetEmail: (input: {
    to: string;
    resetUrl: string;
    expiresAt: Date;
  }) => Promise<{ outcome: "sent" | "skipped" | "failed" }>;
  resolveAppBaseUrl: () => string;
};

export async function requestStaffPasswordReset(
  email: string,
  deps: StaffPasswordResetRequestDeps,
): Promise<
  | { outcome: "success"; message: string }
  | { outcome: "rate_limited"; message: string }
> {
  const now = deps.now ?? new Date();
  const normalizedEmail = email.trim();

  const rate = await deps.consumeRequestAllowance();
  if (!rate.ok) {
    return {
      outcome: "rate_limited",
      message: STAFF_PASSWORD_RESET_RATE_LIMIT_MESSAGE,
    };
  }

  const matches = await deps.findStaffAccountsByEmail(normalizedEmail);
  if (matches.length !== 1) {
    return {
      outcome: "success",
      message: STAFF_PASSWORD_RESET_GENERIC_SUCCESS_MESSAGE,
    };
  }

  const account = matches[0]!;
  const rawToken = generateStaffPasswordResetToken();
  const tokenHash = hashStaffPasswordResetToken(rawToken);
  const expiresAt = staffPasswordResetExpiresAt(now);

  await deps.createResetToken({
    tokenHash,
    userId: account.id,
    email: account.email,
    gymId: account.gymId,
    expiresAt,
    createdAt: now,
  });

  const baseUrl = deps.resolveAppBaseUrl();
  const resetUrl = buildStaffPasswordResetUrl(baseUrl, rawToken);

  await deps.sendResetEmail({
    to: account.email,
    resetUrl,
    expiresAt,
  });

  return {
    outcome: "success",
    message: STAFF_PASSWORD_RESET_GENERIC_SUCCESS_MESSAGE,
  };
}

export type StaffPasswordResetCompleteDeps = {
  now?: Date;
  hashPassword: (password: string) => Promise<string>;
  redeemToken: (
    tokenHash: string,
    passwordHash: string,
    now: Date,
  ) => Promise<StaffPasswordResetCompletionOutcome>;
};

export async function completeStaffPasswordReset(input: {
  rawToken: string;
  password: string;
  confirmPassword: string;
  deps: StaffPasswordResetCompleteDeps;
}): Promise<
  | { outcome: "success" }
  | { outcome: StaffPasswordResetCompletionOutcome; message: string }
> {
  if (input.password !== input.confirmPassword) {
    return { outcome: "password_mismatch", message: "Passwords do not match." };
  }

  const validationMessage = validateStaffResetPassword(input.password);
  if (validationMessage) {
    return { outcome: "validation_error", message: validationMessage };
  }

  const tokenHash = hashStaffPasswordResetToken(input.rawToken);
  if (!tokenHash || tokenHash.length !== 64) {
    return {
      outcome: "invalid_token",
      message: "This reset link is invalid or has expired.",
    };
  }

  const now = input.deps.now ?? new Date();
  const passwordHash = await input.deps.hashPassword(input.password);
  const redeemOutcome = await input.deps.redeemToken(tokenHash, passwordHash, now);

  if (redeemOutcome === "success") {
    return { outcome: "success" };
  }

  const messageByOutcome: Record<
    Exclude<StaffPasswordResetCompletionOutcome, "success" | "validation_error" | "password_mismatch">,
    string
  > = {
    invalid_token: "This reset link is invalid or has expired.",
    expired_token: "This reset link has expired. Request a new one.",
    used_token: "This reset link has already been used. Request a new one.",
  };

  if (redeemOutcome === "validation_error" || redeemOutcome === "password_mismatch") {
    return { outcome: redeemOutcome, message: "Unable to reset password." };
  }

  return {
    outcome: redeemOutcome,
    message: messageByOutcome[redeemOutcome],
  };
}

export { STAFF_PASSWORD_BCRYPT_ROUNDS };

export function isStaffPasswordResetTokenExpired(
  doc: Pick<StaffPasswordResetTokenDoc, "expiresAt">,
  now: Date,
): boolean {
  return doc.expiresAt.toDate().getTime() <= now.getTime();
}