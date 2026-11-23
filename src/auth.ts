import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

import { resolveCredentialsVersion } from "@/lib/staff-auth/credentials-version";
import {
  evaluateStaffGoogleSignIn,
  isStaffGoogleSignInConfigured,
} from "@/lib/staff-auth/google-sign-in";
import { authConfig } from "@/auth.config";
import { getRepositories, platformContext } from "@/lib/firestore";

const STAFF_GOOGLE_SIGN_IN_DENIED_PATH = "/login?error=GoogleSignInDenied";

/** Google OAuth email_verified must be explicitly true — missing or false rejects sign-in. */
export function parseGoogleEmailVerified(profile: unknown): boolean {
  if (profile == null || typeof profile !== "object") {
    return false;
  }
  return (profile as { email_verified?: unknown }).email_verified === true;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    ...(isStaffGoogleSignInConfigured()
      ? [
          Google({
            clientId: process.env.STAFF_AUTH_GOOGLE_CLIENT_ID!,
            clientSecret: process.env.STAFF_AUTH_GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") {
        return STAFF_GOOGLE_SIGN_IN_DENIED_PATH;
      }

      const rawEmail = user.email ?? profile?.email;
      if (!rawEmail) {
        return STAFF_GOOGLE_SIGN_IN_DENIED_PATH;
      }

      const emailVerified = parseGoogleEmailVerified(profile);

      const normalizedEmail = rawEmail.trim().toLowerCase();
      const { users, gyms } = getRepositories();
      const dbUser = await users.findByEmail(platformContext, normalizedEmail);

      let gym = null;
      if (dbUser?.role !== "SUPER_ADMIN" && dbUser?.gymId) {
        gym = await gyms.getById(platformContext, dbUser.gymId);
      }

      const decision = evaluateStaffGoogleSignIn({
        emailVerified,
        googleEmail: rawEmail.trim(),
        user: dbUser
          ? {
              id: dbUser.id,
              name: dbUser.name,
              email: dbUser.email,
              role: dbUser.role,
              gymId: dbUser.gymId,
              credentialsVersion: dbUser.credentialsVersion,
            }
          : null,
        gym,
      });

      if (!decision.ok) {
        console.warn("[staff-auth] Google sign-in rejected:", decision.reason);
        return STAFF_GOOGLE_SIGN_IN_DENIED_PATH;
      }

      const gymStaff = decision.user;
      const u = user as {
        id?: string;
        role?: typeof gymStaff.role;
        gymId?: string | null;
        credentialsVersion?: number;
      };
      u.id = gymStaff.id;
      u.role = gymStaff.role;
      u.gymId = gymStaff.gymId;
      u.credentialsVersion = resolveCredentialsVersion(
        gymStaff.credentialsVersion,
      );

      return true;
    },
  },
});