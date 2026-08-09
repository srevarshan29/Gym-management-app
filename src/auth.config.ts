import { NextResponse } from "next/server";
import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";

/**
 * Edge-safe auth config (no Prisma / bcrypt here so it can run in middleware).
 * The Credentials provider with DB access lives in `src/auth.ts`.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLogin = nextUrl.pathname.startsWith("/login");
      // Platform-level accounts have no gym; route them straight to the
      // gym-provisioning dashboard instead of the (gym-scoped) app shell.
      const isSuperAdmin = auth?.user?.role === "SUPER_ADMIN";
      // A session token minted before gymId existed (or otherwise missing
      // it) can't be routed anywhere sensible — without clearing it here,
      // / and /admin would just keep redirecting to each other forever.
      const isBrokenSession = isLoggedIn && !isSuperAdmin && !auth?.user?.gymId;

      if (isBrokenSession && !isOnLogin) {
        const response = NextResponse.redirect(new URL("/login", nextUrl));
        response.cookies.delete("authjs.session-token");
        response.cookies.delete("__Secure-authjs.session-token");
        return response;
      }

      if (isOnLogin) {
        // Signed-in users hitting /login get bounced to their home page.
        if (isLoggedIn && !isBrokenSession) {
          return Response.redirect(new URL(isSuperAdmin ? "/admin" : "/", nextUrl));
        }
        if (isBrokenSession) {
          const response = NextResponse.next();
          response.cookies.delete("authjs.session-token");
          response.cookies.delete("__Secure-authjs.session-token");
          return response;
        }
        return true;
      }

      // /logout is a Route Handler that clears the session cookie — must be
      // reachable even when the JWT is stale (e.g. user deleted from DB).
      const isLogout = nextUrl.pathname.startsWith("/logout");
      if (isLogout) {
        return true;
      }

      const isPublicRegister = nextUrl.pathname.startsWith("/register");
      if (isPublicRegister) {
        return true;
      }

      // Every other (matched) route requires a session.
      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) {
        const u = user as { id?: string; role?: Role; gymId?: string | null };
        token.id = u.id ?? "";
        token.role = (u.role ?? "STAFF") as Role;
        token.gymId = u.gymId ?? null;
        token.name = user.name;
        token.email = user.email;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? "";
        session.user.role = ((token.role as Role) ?? "STAFF") as Role;
        session.user.gymId = (token.gymId as string | null | undefined) ?? null;
        session.user.name = (token.name as string | null | undefined) ?? session.user.name;
        session.user.email = (token.email as string | null | undefined) ?? session.user.email;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
