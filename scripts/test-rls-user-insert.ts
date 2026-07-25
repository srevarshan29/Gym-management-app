/**
 * Smoke test: tenant user insert under RLS (gym_app role).
 * Usage: npx tsx scripts/test-rls-user-insert.ts
 */
import { PrismaClient } from "@prisma/client";

import { withTenant } from "../src/lib/db-context";

const gymId = "gym_default_0000000001";

async function main() {
  if (process.env.USE_RLS_ROLE !== "true") {
    console.log("Skipping: USE_RLS_ROLE is not true.");
    return;
  }

  const testEmail = `rls-test-${Date.now()}@test.local`;

  try {
    await withTenant(gymId, async (tx) => {
      const guc = await tx.$queryRaw<
        { gym_id: string | null; is_super: boolean }[]
      >`SELECT app_current_gym_id() as gym_id, app_is_super_admin() as is_super`;
      console.log("GUCs:", guc);

      await tx.user.create({
        data: {
          name: "RLS Test Staff",
          email: testEmail,
          passwordHash: "hash",
          role: "STAFF",
          gymId,
        },
      });
    });
    console.log("Insert OK:", testEmail);

    const directUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
    if (directUrl) {
      const admin = new PrismaClient({ datasources: { db: { url: directUrl } } });
      await admin.user.delete({ where: { email: testEmail } }).catch(() => {});
      await admin.$disconnect();
    }
  } catch (e) {
    console.error("FAIL:", e);
    process.exit(1);
  }
}

main();
