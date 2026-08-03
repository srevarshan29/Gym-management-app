import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import type { Role } from "@prisma/client";

import { auth } from "@/auth";

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: Role;
  gymId: string | null;
};

/** A SessionUser known to belong to a gym (gymId narrowed to string). */
export type GymSessionUser = SessionUser & { gymId: string };

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  return session.user as SessionUser;
}

/** Use in server components/actions to require any authenticated staff member. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Throws if the current user is not an OWNER. For use inside server actions. */
export async function requireOwner(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "OWNER") {
    throw new Error("Forbidden: this action requires owner permissions.");
  }
  return user;
}

/**
 * The single source of "who is the current user, and which gym's data can
 * they see". Every gym-scoped page/action should call this instead of
 * requireUser() so the tenant filter is always available and never optional.
 *
 * SUPER_ADMIN accounts have no gym and are redirected to the platform admin
 * dashboard instead — they should never read/write gym-scoped data directly.
 */
export async function requireGym(): Promise<GymSessionUser> {
  const user = await requireUser();
  if (user.role === "SUPER_ADMIN" || !user.gymId) {
    redirect("/admin");
  }
  return user as GymSessionUser;
}

/** Route handlers: return 401 instead of redirecting to login. */
export async function requireGymForApi(): Promise<
  GymSessionUser | NextResponse
> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role === "SUPER_ADMIN" || !user.gymId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return user as GymSessionUser;
}

/** Throws if the current user is not a gym OWNER. For use inside server actions. */
export async function requireGymOwner(): Promise<GymSessionUser> {
  const user = await requireGym();
  if (user.role !== "OWNER") {
    throw new Error("Forbidden: this action requires owner permissions.");
  }
  return user;
}

/** Use for the platform-level /admin dashboard. Redirects everyone else back into the app. */
export async function requireSuperAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") {
    redirect("/");
  }
  return user;
}
