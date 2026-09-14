import type { StaffRole } from "@/lib/firestore/types";

/**
 * Server-side access context — mirrors Auth.js staff session and member portal session.
 * All Firestore repositories must receive a context and enforce gymId scoping.
 */
export type StaffContext = {
  kind: "staff";
  userId: string;
  gymId: string;
  role: StaffRole;
};

export type SuperAdminContext = {
  kind: "super_admin";
  userId: string;
};

export type MemberContext = {
  kind: "member";
  memberId: string;
  gymId: string;
};

/** Trusted server-only operations (rate limits, cron, migrations). */
export type PlatformContext = {
  kind: "platform";
};

export type FirestoreContext =
  | StaffContext
  | SuperAdminContext
  | MemberContext
  | PlatformContext;

export function requireGymId(ctx: FirestoreContext): string {
  switch (ctx.kind) {
    case "staff":
    case "member":
      return ctx.gymId;
    case "super_admin":
    case "platform":
      throw new Error("requireGymId called without a tenant context.");
  }
}

/** Assert a loaded document belongs to the caller's gym (application-level isolation). */
export function assertTenantAccess(
  ctx: FirestoreContext,
  docGymId: string,
): void {
  if (ctx.kind === "platform" || ctx.kind === "super_admin") return;
  if (ctx.gymId !== docGymId) {
    throw new Error("Tenant isolation violation: gymId mismatch.");
  }
}

/** Members may only access their own memberId unless staff/platform. */
export function assertMemberSelfAccess(
  ctx: FirestoreContext,
  memberId: string,
): void {
  if (ctx.kind !== "member") return;
  if (ctx.memberId !== memberId) {
    throw new Error("Member isolation violation: memberId mismatch.");
  }
}
