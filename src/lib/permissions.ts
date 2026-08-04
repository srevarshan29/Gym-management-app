import type { Role } from "@prisma/client";

/**
 * Central role-based permission helpers.
 * Server-side checks are the source of truth; the UI mirrors these to hide controls.
 */

/** Gym-wide revenue aggregates, payment history reports, dashboard financial cards. */
export function canViewFinancials(role: Role | undefined | null): boolean {
  return role === "OWNER";
}

/** Manual ledger on Accounts & Finance (same sensitivity as gym-wide financials). */
export function canManageLedger(role: Role | undefined | null): boolean {
  return canViewFinancials(role);
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

/** HR employee records (salary optional). Owner and Admin only. */
export function canManageEmployees(role: Role | undefined | null): boolean {
  return canManagePackages(role);
}

/** Gym events (workshops, open houses). Owner, Admin, and Staff. */
export function canManageEvents(role: Role | undefined | null): boolean {
  return canManageMembers(role);
}

/** CSV reports (bulk export). Owner and Admin only. */
export function canExportReports(role: Role | undefined | null): boolean {
  return canManageEmployees(role);
}

export function canManageMembers(role: Role | undefined | null): boolean {
  return role === "OWNER" || role === "ADMIN" || role === "STAFF";
}
