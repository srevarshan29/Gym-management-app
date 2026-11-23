"use server";

import { signIn, signOut } from "@/auth";
import { isStaffGoogleSignInConfigured } from "@/lib/staff-auth/google-sign-in";

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}

export async function startStaffGoogleSignIn(): Promise<void> {
  if (!isStaffGoogleSignInConfigured()) {
    throw new Error("Google sign-in is not configured for staff.");
  }
  await signIn("google", { redirectTo: "/" });
}

/** Retired — staff accounts use Google OAuth only. */
export async function authenticate(
  _prevState: string | undefined,
  _formData: FormData,
): Promise<string> {
  return "Staff sign-in uses Google only. Use the Google button on the sign-in page.";
}