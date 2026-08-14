"use server";

import { AuthError } from "next-auth";

import { signIn, signOut } from "@/auth";
import {
  checkStaffLoginThrottle,
  getStaffLoginClientIp,
  staffLoginRetryMessage,
} from "@/lib/staff-login-throttle";

export async function authenticate(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const email = String(formData.get("email") ?? "");
  const ip = await getStaffLoginClientIp();
  const throttle = await checkStaffLoginThrottle(email, ip);
  if (!throttle.ok) {
    return staffLoginRetryMessage(throttle.retryAfterMs);
  }

  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return "Invalid email or password.";
        default:
          return "Something went wrong. Please try again.";
      }
    }
    // Re-throw redirect errors so Next.js can perform the redirect.
    throw error;
  }
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
