import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { resolveCredentialsVersion } from "@/lib/staff-auth/credentials-version";
import {
  evaluateStaffGoogleSignIn,
  isStaffGoogleSignInConfigured,
} from "@/lib/staff-auth/google-sign-in";
import { staffAccountHasPassword } from "@/lib/staff-auth/password-auth";
import { credentialsPasswordLoginAllowed } from "@/lib/staff-auth/staff-roles";
import { measureServerPhase } from "@/lib/server-perf";
import { authConfig } from "@/auth.config";
import { getRepositories, platformContext } from "@/lib/firestore";
import {
  clearStaffLoginFailures,
  getStaffLoginClientIp,
  recordStaffLoginFailure,
} from "@/lib/staff-login-throttle";
import { isGymIdAccessible } from "@/lib/gym-lifecycle/load-gym-access";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(72),
});

const STAFF_GOOGLE_SIGN_IN_DENIED_PATH = "/login?error=GoogleSignInDenied";

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
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        return measureServerPhase("staff.auth.credentials", async () => {
          const parsed = credentialsSchema.safeParse(credentials);
          if (!parsed.success) return null;

          const { email, password } = parsed.data;
          const ip = await getStaffLoginClientIp();

          const { users } = getRepositories();
          const user = await measureServerPhase(
            "staff.auth.credentials.userLookup",
            () => users.findByEmail(platformContext, email),
          );
          if (!user) {
            await recordStaffLoginFailure(email, ip);
            return null;
          }

          if (!credentialsPasswordLoginAllowed(user.role)) {
            await recordStaffLoginFailure(email, ip);
            return null;
          }

          if (!staffAccountHasPassword(user)) {
            await recordStaffLoginFailure(email, ip);
            return null;
          }

          if (user.role !== "SUPER_ADMIN" && user.gymId) {
            const gymAllowed = await isGymIdAccessible(user.gymId);
            if (!gymAllowed) {
              await recordStaffLoginFailure(email, ip);
              return null;
            }
          }

          const passwordMatches = await measureServerPhase(
            "staff.auth.credentials.bcrypt",
            () => bcrypt.compare(password, user.passwordHash!),
          );
          if (!passwordMatches) {
            await recordStaffLoginFailure(email, ip);
            return null;
          }

          await clearStaffLoginFailures(email, ip);

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            gymId: user.gymId,
            credentialsVersion: resolveCredentialsVersion(user.credentialsVersion),
          };
        });
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") {
        return true;
      }

      const rawEmail = user.email ?? profile?.email;
      if (!rawEmail) {
        return STAFF_GOOGLE_SIGN_IN_DENIED_PATH;
      }

      const googleProfile = profile as { email_verified?: boolean } | undefined;
      const emailVerified = googleProfile?.email_verified !== false;

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