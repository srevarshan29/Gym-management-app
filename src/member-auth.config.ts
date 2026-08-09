import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe member portal auth (no Prisma/bcrypt in middleware).
 * Credentials provider with DB access lives in `src/member-auth.ts`.
 */
export const memberAuthConfig = {
  basePath: "/api/member-auth",
  pages: {
    signIn: "/member/login",
  },
  session: {
    strategy: "jwt",
  },
  cookies: {
    sessionToken: {
      name: "authjs.member-session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const path = nextUrl.pathname;
      const isLoggedIn = !!auth?.user;

      const isLogin =
        path === "/member/login" || path.startsWith("/member/login/");
      const isAuthError = path === "/member/auth-error";
      const isMemberLogout = path.startsWith("/member/logout");
      const isMemberAuthApi = path.startsWith("/api/member-auth");

      if (isLogin || isAuthError || isMemberLogout || isMemberAuthApi) {
        if (isLogin && isLoggedIn) {
          return Response.redirect(new URL("/member", nextUrl));
        }
        return true;
      }

      if (path.startsWith("/member")) {
        return isLoggedIn;
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        const u = user as {
          memberId?: string;
          gymId?: string;
          memberNumber?: number;
        };
        token.kind = "member";
        token.id = u.memberId ?? user.id ?? "";
        token.memberId = u.memberId ?? "";
        token.gymId = u.gymId ?? "";
        token.memberNumber = u.memberNumber ?? 0;
        token.name = user.name;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.kind = "member";
        session.user.memberId = (token.memberId as string) ?? "";
        session.user.id = (token.memberId as string) ?? "";
        session.user.gymId = (token.gymId as string) ?? "";
        session.user.memberNumber = (token.memberNumber as number) ?? 0;
        session.user.name = (token.name as string | null | undefined) ?? session.user.name;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
