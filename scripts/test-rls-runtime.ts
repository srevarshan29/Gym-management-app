/**
 * Runtime RLS smoke test using DATABASE_URL_RLS (gym_app role).
 * Fails fast if policies block expected access patterns.
 *
 * Usage: npx tsx scripts/test-rls-runtime.ts
 */
import { PrismaClient } from "@prisma/client";

const rlsUrl = process.env.DATABASE_URL_RLS;
if (!rlsUrl) {
  console.error("DATABASE_URL_RLS is not set. Run scripts/ensure-gym-app-role.ts first.");
  process.exit(1);
}

const prisma = new PrismaClient({ datasources: { db: { url: rlsUrl } } });

const GYM_A = "gym_default_0000000001";

async function withCtx<T>(
  setGucs: (tx: PrismaClient) => Promise<void>,
  fn: (tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await setGucs(tx as unknown as PrismaClient);
    return fn(tx);
  });
}

async function main() {
  console.log("Testing RLS as gym_app...");

  const gymCount = await withCtx(
    async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.gym_id', ${GYM_A}, true)`;
    },
    (tx) => tx.gym.count(),
  );
  if (gymCount !== 1) {
    throw new Error(`Expected 1 gym for tenant, got ${gymCount}`);
  }
  console.log("  tenant gym scope: OK");

  const blocked = await withCtx(
    async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.gym_id', 'gym_nonexistent_9999999999', true)`;
    },
    (tx) => tx.gym.count(),
  );
  if (blocked !== 0) {
    throw new Error(`Expected 0 gyms for wrong tenant, got ${blocked}`);
  }
  console.log("  cross-tenant block: OK");

  const superCount = await withCtx(
    async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.gym_id', '', true)`;
      await tx.$executeRaw`SELECT set_config('app.is_super_admin', 'true', true)`;
    },
    (tx) => tx.gym.count(),
  );
  if (superCount < 1) {
    throw new Error(`Expected super_admin to see gyms, got ${superCount}`);
  }
  console.log("  super_admin access: OK");

  const loginUser = await withCtx(
    async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.platform_lookup', 'true', true)`;
    },
    (tx) => tx.user.findUnique({ where: { email: "owner@gym.test" } }),
  );
  if (!loginUser) {
    throw new Error("platform_lookup could not find owner@gym.test");
  }
  console.log("  platform_lookup login: OK");

  console.log("\nAll RLS runtime tests passed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
