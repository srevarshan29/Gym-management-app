import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { cookies } from "next/headers";

import { withPlatformLookup } from "@/lib/db-context";
import {
  MEMBER_PORTAL_GYM_TOKEN_COOKIE,
  normalizeMemberEmail,
} from "@/lib/member-portal/constants";
import { memberAuthConfig } from "@/member-auth.config";

const MEMBER_AUTH_ERROR_PATH = "/member/auth-error";

function googleConfigured(): boolean {
  return !!(
    process.env.MEMBER_AUTH_GOOGLE_CLIENT_ID &&
    process.env.MEMBER_AUTH_GOOGLE_CLIENT_SECRET
  );
}

export const {
  handlers: memberHandlers,
  auth: memberAuth,
  signIn: memberSignIn,
  signOut: memberSignOut,
} = NextAuth({
  ...memberAuthConfig,
  providers: googleConfigured()
    ? [
        Google({
          clientId: process.env.MEMBER_AUTH_GOOGLE_CLIENT_ID!,
          clientSecret: process.env.MEMBER_AUTH_GOOGLE_CLIENT_SECRET!,
        }),
      ]
    : [],
  callbacks: {
    ...memberAuthConfig.callbacks,
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") {
        return MEMBER_AUTH_ERROR_PATH;
      }

      const cookieStore = await cookies();
      const clearGymCookie = () => {
        cookieStore.delete(MEMBER_PORTAL_GYM_TOKEN_COOKIE);
      };

      try {
        const rawEmail = user.email ?? profile?.email;
        if (!rawEmail) {
          return MEMBER_AUTH_ERROR_PATH;
        }

        const googleProfile = profile as { email_verified?: boolean } | undefined;
        if (googleProfile?.email_verified === false) {
          return MEMBER_AUTH_ERROR_PATH;
        }

        const gymToken = cookieStore.get(MEMBER_PORTAL_GYM_TOKEN_COOKIE)?.value;
        if (!gymToken) {
          return MEMBER_AUTH_ERROR_PATH;
        }

        const normalizedEmail = normalizeMemberEmail(rawEmail);

        const gym = await withPlatformLookup((tx) =>
          tx.gym.findUnique({
            where: { registrationToken: gymToken },
            select: { id: true },
          }),
        );
        if (!gym) {
          return MEMBER_AUTH_ERROR_PATH;
        }

        const member = await withPlatformLookup((tx) =>
          tx.member.findFirst({
            where: {
              gymId: gym.id,
              email: { equals: normalizedEmail, mode: "insensitive" },
              portalEnabledAt: { not: null },
            },
            select: {
              id: true,
              gymId: true,
              name: true,
              memberNumber: true,
            },
          }),
        );

        if (!member) {
          return MEMBER_AUTH_ERROR_PATH;
        }

        const u = user as {
          memberId?: string;
          gymId?: string;
          memberNumber?: number;
          name?: string | null;
        };
        u.memberId = member.id;
        u.gymId = member.gymId;
        u.memberNumber = member.memberNumber;
        u.name = member.name;

        return true;
      } catch (error) {
        console.error("[member-auth] signIn callback failed:", error);
        return MEMBER_AUTH_ERROR_PATH;
      } finally {
        clearGymCookie();
      }
    },
  },
});
