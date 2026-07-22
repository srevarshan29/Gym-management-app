import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Runtime DB URL selection:
 * - USE_RLS_ROLE=false (default): DATABASE_URL (postgres, bypasses RLS) — safe rollback.
 * - USE_RLS_ROLE=true: DATABASE_URL_RLS (gym_app, RLS enforced).
 *
 * Migrations/seeds always use DIRECT_URL via schema.prisma directUrl.
 */
function resolveDatabaseUrl(): string {
  const useRls = process.env.USE_RLS_ROLE === "true";
  if (useRls) {
    const rlsUrl = process.env.DATABASE_URL_RLS;
    if (!rlsUrl) {
      throw new Error(
        "USE_RLS_ROLE=true but DATABASE_URL_RLS is not set. " +
          "Run scripts/setup-gym-app-role.sql and add the gym_app connection string.",
      );
    }
    return rlsUrl;
  }
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set.");
  }
  return url;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: resolveDatabaseUrl() } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/** True when the app is connected as the restricted gym_app role. */
export function isRlsEnforced(): boolean {
  return process.env.USE_RLS_ROLE === "true";
}
