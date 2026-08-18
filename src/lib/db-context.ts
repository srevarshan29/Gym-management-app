import type { Prisma } from "@prisma/client";
import { Prisma as PrismaNamespace } from "@prisma/client";

import { isRlsEnforced, prisma } from "@/lib/prisma";

export type DbContext =
  | { kind: "tenant"; gymId: string }
  | { kind: "super_admin" }
  | { kind: "platform_lookup" };

const TX_OPTIONS = {
  maxWait: 25_000,
  timeout: 30_000,
} as const;

const TRANSIENT_ERROR_CODES = new Set([
  "P1001", // Can't reach database server
  "P1002", // Database server timed out
  "P1017", // Server closed the connection
  "P2034", // Transaction failed due to conflict
]);

function asTransactionClient(client: typeof prisma): Prisma.TransactionClient {
  return client as unknown as Prisma.TransactionClient;
}

function isPoolExhaustionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message;
  return (
    msg.includes("Unable to start a transaction") ||
    msg.includes("Timed out fetching a new connection from the connection pool") ||
    msg.includes("EMAXCONNSESSION") ||
    msg.includes("max clients reached")
  );
}

function isTransientDbError(error: unknown): boolean {
  // Pool exhausted — retrying immediately makes contention worse.
  if (isPoolExhaustionError(error)) return false;

  if (error instanceof PrismaNamespace.PrismaClientKnownRequestError) {
    if (error.code === "P2028") return false;
    return TRANSIENT_ERROR_CODES.has(error.code);
  }
  if (error instanceof Error) {
    const msg = error.message;
    return (
      msg.includes("Server has closed the connection") ||
      msg.includes("Transaction already closed") ||
      msg.includes("Connection terminated")
    );
  }
  return false;
}

async function applyContext(
  tx: Prisma.TransactionClient,
  ctx: DbContext,
): Promise<void> {
  switch (ctx.kind) {
    case "tenant":
      await tx.$executeRaw`SELECT set_config('app.gym_id', ${ctx.gymId}, true)`;
      // Explicit false — unset GUCs make app_is_super_admin() NULL and break NOT checks.
      await tx.$executeRaw`SELECT set_config('app.is_super_admin', 'false', true)`;
      await tx.$executeRaw`SELECT set_config('app.platform_lookup', 'false', true)`;
      break;
    case "super_admin":
      await tx.$executeRaw`SELECT set_config('app.gym_id', '', true)`;
      await tx.$executeRaw`SELECT set_config('app.is_super_admin', 'true', true)`;
      await tx.$executeRaw`SELECT set_config('app.platform_lookup', 'false', true)`;
      break;
    case "platform_lookup":
      await tx.$executeRaw`SELECT set_config('app.gym_id', '', true)`;
      await tx.$executeRaw`SELECT set_config('app.is_super_admin', 'false', true)`;
      await tx.$executeRaw`SELECT set_config('app.platform_lookup', 'true', true)`;
      break;
  }
}

/** RLS enforced: interactive transaction + session GUCs (unchanged behavior). */
async function runInContextRls<T>(
  ctx: DbContext,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await applyContext(tx, ctx);
    return fn(tx);
  }, TX_OPTIONS);
}

/**
 * RLS not enforced: skip GUCs. Platform lookups are read-only and run
 * directly; tenant/super_admin paths keep transactions for write atomicity.
 */
async function runInContextNoRls<T>(
  ctx: DbContext,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  if (ctx.kind === "platform_lookup") {
    return fn(asTransactionClient(prisma));
  }
  return prisma.$transaction((tx) => fn(tx), TX_OPTIONS);
}

async function runInContext<T>(
  ctx: DbContext,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  if (isRlsEnforced()) {
    return runInContextRls(ctx, fn);
  }
  return runInContextNoRls(ctx, fn);
}

/**
 * Runs fn inside a transaction with RLS session GUCs set via SET LOCAL
 * when USE_RLS_ROLE=true. When RLS is off, GUCs are skipped and
 * platform lookups run without a transaction.
 */
export async function withDbContext<T>(
  ctx: DbContext,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await runInContext(ctx, fn);
    } catch (error) {
      lastError = error;
      if (isPoolExhaustionError(error) && attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
      if (!isTransientDbError(error) || attempt === 2) {
        throw error;
      }
      await prisma.$connect();
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }

  throw lastError;
}

export function withTenant<T>(
  gymId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  if (typeof gymId !== "string" || gymId.length === 0) {
    throw new Error("withTenant requires a non-empty gymId");
  }
  return withDbContext({ kind: "tenant", gymId }, fn);
}

export function withSuperAdmin<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return withDbContext({ kind: "super_admin" }, fn);
}

export function withPlatformLookup<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return withDbContext({ kind: "platform_lookup" }, fn);
}
