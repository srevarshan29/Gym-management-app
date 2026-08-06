import { NextResponse } from "next/server";

import { signOut } from "@/auth";

/**
 * Clears the Auth.js session and redirects to /login.
 *
 * Cookie writes are only allowed in Server Actions / Route Handlers, so
 * Server Components that detect a stale JWT (e.g. deleted user) must
 * `redirect("/logout")` here instead of calling `signOut()` themselves.
 */
export async function GET(request: Request) {
  await signOut({ redirect: false });
  return NextResponse.redirect(new URL("/login", request.url));
}
