import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type DbContext =
  | { kind: "tenant"; gymId: string }
  | { kind: "super_admin" }
  | { kind: "platform_lookup" };

async function applyContext(
  tx: Prisma.TransactionClient,
  ctx: DbContext,
): Promise<void> {
  switch (ctx.kind) {
    case "tenant":
      await tx.$executeRaw`SELECT set_config('app.gym_id', ${ctx.gymId}, true)`;
      break;
    case "super_admin":
      await tx.$executeRaw`SELECT set_config('app.is_super_admin', 'true', true)`;
      break;
    case "platform_lookup":
      await tx.$executeRaw`SELECT set_config('app.platform_lookup', 'true', true)`;
      break;
  }
}

/**
 * Runs fn inside a transaction with RLS session GUCs set via SET LOCAL.
 * Required for Supabase transaction pooler (pgbouncer) — GUCs must live
 * inside the same transaction as the queries they protect.
 */
export async function withDbContext<T>(
  ctx: DbContext,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await applyContext(tx, ctx);
    return fn(tx);
  });
}

export function withTenant<T>(
  gymId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
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
