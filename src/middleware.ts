import type { NextRequest } from "next/server";
import NextAuth from "next-auth";

import { authConfig } from "@/auth.config";
import { memberAuthConfig } from "@/member-auth.config";

const staffMiddleware = NextAuth(authConfig).auth;
const memberMiddleware = NextAuth(memberAuthConfig).auth;

/** Member portal lives at /member and /member/* — not /members (staff). */
function isMemberPortalPath(path: string): boolean {
  return (
    path === "/member" ||
    path.startsWith("/member/") ||
    path.startsWith("/api/member-auth")
  );
}

export default function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (isMemberPortalPath(path)) {
    return memberMiddleware(request as never);
  }
  return staffMiddleware(request as never);
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
