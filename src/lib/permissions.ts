import type { Role } from "@prisma/client";

/**
 * Central role-based permission helpers.
 * Server-side checks are the source of truth; the UI mirrors these to hide controls.
 */

/** Gym-wide revenue aggregates, payment history reports, dashboard financial cards. */
export function canViewFinancials(role: Role | undefined | null): boolean {
  return role === "OWNER";
}

/** Record a payment against a member (Owner, Admin, Staff). */
export function canLogPayments(role: Role | undefined | null): boolean {
  return role === "OWNER" || role === "ADMIN" || role === "STAFF";
}

/**
 * Per-member subs/paid/pending context needed to collect dues — operational data,
 * not gym-wide financial reporting. Same roles as canLogPayments.
 */
export function canViewMemberBalances(role: Role | undefined | null): boolean {
  return canLogPayments(role);
}

export function canDeleteMembers(role: Role | undefined | null): boolean {
  return role === "OWNER";
}

export function canManageStaff(role: Role | undefined | null): boolean {
  return role === "OWNER";
}

export function canManagePackages(role: Role | undefined | null): boolean {
  return role === "OWNER" || role === "ADMIN";
}

export function canManageMembers(role: Role | undefined | null): boolean {
  return role === "OWNER" || role === "ADMIN" || role === "STAFF";
}
