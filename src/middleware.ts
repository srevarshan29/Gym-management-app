import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Uses only the edge-safe config (no Prisma/bcrypt) to gate routes.
export default NextAuth(authConfig).auth;

export const config = {
  // Protect everything except Next internals, the auth API, and static assets.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
