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
function normalizeSupabasePoolerUrl(url: string): string {
  const parsed = new URL(url.replace(/^postgresql:/, "postgres:"));
  // Session pooler (5432) has IPv4 and supports interactive transactions.
  // Transaction pooler (6543) is IPv4 too but breaks prisma.$transaction GUC setup.
  if (
    parsed.hostname.includes("pooler.supabase.com") &&
    (parsed.port === "6543" || parsed.searchParams.has("pgbouncer"))
  ) {
    parsed.port = "5432";
    parsed.searchParams.delete("pgbouncer");
  }
  return parsed.toString().replace(/^postgres:/, "postgresql:");
}

function withPoolParams(url: string): string {
  const parsed = new URL(url.replace(/^postgresql:/, "postgres:"));
  if (!parsed.searchParams.has("connection_limit")) {
    parsed.searchParams.set("connection_limit", "5");
  }
  if (!parsed.searchParams.has("pool_timeout")) {
    parsed.searchParams.set("pool_timeout", "45");
  }
  if (!parsed.searchParams.has("connect_timeout")) {
    parsed.searchParams.set("connect_timeout", "30");
  }
  return parsed.toString().replace(/^postgres:/, "postgresql:");
}

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
    const rlsHost = new URL(
      rlsUrl.replace(/^postgresql:/, "postgres:"),
    ).hostname;
    // db.*.supabase.co is IPv6-only — unreachable on many networks (and with ipv4first DNS).
    if (rlsHost.startsWith("db.") && rlsHost.endsWith(".supabase.co")) {
      const fallback = process.env.DATABASE_URL;
      if (!fallback) {
        throw new Error(
          "DATABASE_URL_RLS uses the direct Supabase host (IPv6-only). " +
            "Set USE_RLS_ROLE=false or use the session pooler DATABASE_URL instead.",
        );
      }
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[prisma] Direct Supabase host unreachable on IPv4 — using DATABASE_URL pooler. " +
            "Set USE_RLS_ROLE=false to silence this.",
        );
      }
      return withPoolParams(normalizeSupabasePoolerUrl(fallback));
    }
    return withPoolParams(rlsUrl);
  }
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set.");
  }
  return withPoolParams(normalizeSupabasePoolerUrl(url));
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    datasources: { db: { url: resolveDatabaseUrl() } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

/** Drop a dev singleton created before the generated client included new models. */
function isStaleDevPrismaClient(client: PrismaClient): boolean {
  if (process.env.NODE_ENV === "production") return false;
  const c = client as PrismaClient & {
    employee?: unknown;
    gymEvent?: unknown;
    ledgerTransaction?: unknown;
    exercise?: { findFirst?: unknown };
  };
  return (
    typeof c.employee === "undefined" ||
    typeof c.gymEvent === "undefined" ||
    typeof c.ledgerTransaction === "undefined" ||
    typeof c.exercise?.findFirst === "undefined"
  );
}

function initPrisma(): PrismaClient {
  let client = globalForPrisma.prisma;
  if (client && isStaleDevPrismaClient(client)) {
    void client.$disconnect().catch(() => {});
    globalForPrisma.prisma = undefined;
    client = undefined;
  }
  if (!client) {
    client = createPrismaClient();
    if (process.env.NODE_ENV !== "production") {
      globalForPrisma.prisma = client;
    }
  }
  return client;
}

export const prisma = initPrisma();

/** True when the app is connected as the restricted gym_app role. */
export function isRlsEnforced(): boolean {
  return process.env.USE_RLS_ROLE === "true";
}
