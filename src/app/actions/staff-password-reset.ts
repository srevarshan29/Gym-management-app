"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getRepositories, platformContext } from "@/lib/firestore";
import { sendStaffPasswordResetEmail } from "@/lib/email/send-staff-password-reset-email";
import { getAppBaseUrl } from "@/lib/registration";
import {
  STAFF_PASSWORD_BCRYPT_ROUNDS,
  STAFF_PASSWORD_RESET_GENERIC_SUCCESS_MESSAGE,
  completeStaffPasswordReset,
  requestStaffPasswordReset,
} from "@/lib/staff-auth/self-service-password-reset";
import { checkStaffPasswordResetRequestThrottle } from "@/lib/staff-auth/staff-password-reset-request-throttle";
import { getStaffLoginClientIp } from "@/lib/staff-login-throttle";

const forgotPasswordSchema = z.object({
  email: z.string().trim().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().trim().min(16).max(256),
  password: z.string().min(1).max(128),
  confirmPassword: z.string().min(1).max(128),
});

export type ForgotPasswordFormState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export async function requestStaffPasswordResetAction(
  _prev: ForgotPasswordFormState | undefined,
  formData: FormData,
): Promise<ForgotPasswordFormState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return {
      status: "success",
      message: STAFF_PASSWORD_RESET_GENERIC_SUCCESS_MESSAGE,
    };
  }

  const ip = await getStaffLoginClientIp();
  const { users, staffPasswordResetTokens } = getRepositories();

  const result = await requestStaffPasswordReset(parsed.data.email, {
    findStaffAccountsByEmail: async (email) => {
      const matches = await users.listByEmail(platformContext, email);
      return matches.map((user) => ({
        id: user.id,
        email: user.email,
        gymId: user.gymId,
      }));
    },
    consumeRequestAllowance: () =>
      checkStaffPasswordResetRequestThrottle(parsed.data.email, ip),
    createResetToken: async (input) => {
      await staffPasswordResetTokens.createToken(input);
    },
    sendResetEmail: async ({ to, resetUrl, expiresAt }) => {
      const sendResult = await sendStaffPasswordResetEmail({
        to,
        resetUrl,
        expiresAt,
      });
      if (sendResult.outcome === "sent") return { outcome: "sent" };
      if (sendResult.outcome === "skipped") return { outcome: "skipped" };
      return { outcome: "failed" };
    },
    resolveAppBaseUrl: getAppBaseUrl,
  });

  if (result.outcome === "rate_limited") {
    return { status: "error", message: result.message };
  }

  return { status: "success", message: result.message };
}

export type ResetPasswordFormState =
  | { status: "idle" }
  | { status: "error"; message: string };

export async function completeStaffPasswordResetAction(
  _prev: ResetPasswordFormState | undefined,
  formData: FormData,
): Promise<ResetPasswordFormState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the password requirements and try again.",
    };
  }

  const { staffPasswordResetTokens } = getRepositories();
  const complete = await completeStaffPasswordReset({
    rawToken: parsed.data.token,
    password: parsed.data.password,
    confirmPassword: parsed.data.confirmPassword,
    deps: {
      hashPassword: (password) => bcrypt.hash(password, STAFF_PASSWORD_BCRYPT_ROUNDS),
      redeemToken: (tokenHash, passwordHash, now) =>
        staffPasswordResetTokens.redeemToken(tokenHash, passwordHash, now),
    },
  });

  if (complete.outcome === "success") {
    redirect("/login?reset=success");
  }

  return {
    status: "error",
    message: complete.message ?? "Unable to reset password.",
  };
}