/**
 * One-time (idempotent): create gym_app role and print DATABASE_URL_RLS.
 * Uses DIRECT_URL (postgres). Does not enable USE_RLS_ROLE.
 *
 * Usage: npx tsx scripts/ensure-gym-app-role.ts
 */
import { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const directUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!directUrl) {
  console.error("DIRECT_URL or DATABASE_URL required.");
  process.exit(1);
}

const prisma = new PrismaClient({ datasources: { db: { url: directUrl } } });

function randomPassword(): string {
  return crypto.randomBytes(24).toString("base64url");
}

function buildRlsUrl(poolerUrl: string, password: string): string {
  const u = new URL(poolerUrl.replace(/^postgresql:/, "postgres:"));
  u.username = "gym_app";
  u.password = password;
  return u.toString().replace(/^postgres:/, "postgresql:");
}

async function main() {
  const existing = await prisma.$queryRaw<{ rolname: string }[]>`
    SELECT rolname FROM pg_roles WHERE rolname = 'gym_app'
  `;

  let password: string;
  if (existing.length === 0) {
    password = randomPassword();
    await prisma.$executeRawUnsafe(
      `CREATE ROLE gym_app LOGIN PASSWORD '${password.replace(/'/g, "''")}'`,
    );
    console.log("Created role gym_app.");
  } else {
    password = process.env.GYM_APP_PASSWORD ?? randomPassword();
    await prisma.$executeRawUnsafe(
      `ALTER ROLE gym_app WITH LOGIN PASSWORD '${password.replace(/'/g, "''")}'`,
    );
    console.log("Updated gym_app password.");
  }

  await prisma.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO gym_app`);
  await prisma.$executeRawUnsafe(
    `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO gym_app`,
  );
  await prisma.$executeRawUnsafe(
    `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO gym_app`,
  );
  await prisma.$executeRawUnsafe(`
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO gym_app
  `);
  await prisma.$executeRawUnsafe(`
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      GRANT USAGE, SELECT ON SEQUENCES TO gym_app
  `);

  const baseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!baseUrl) {
    console.error("DIRECT_URL or DATABASE_URL required to build connection string.");
    process.exit(1);
  }

  // Supabase pooler (6543) only accepts postgres.[project-ref] usernames.
  // gym_app must use the direct connection (5432) on db.*.supabase.co.
  const rlsUrl = buildRlsUrl(baseUrl, password);
  const envPath = path.join(process.cwd(), ".env");
  let env = fs.readFileSync(envPath, "utf8");

  if (/^DATABASE_URL_RLS=/m.test(env)) {
    env = env.replace(/^DATABASE_URL_RLS=.*$/m, `DATABASE_URL_RLS="${rlsUrl}"`);
  } else {
    env += `\nDATABASE_URL_RLS="${rlsUrl}"\n`;
  }
  if (!/^USE_RLS_ROLE=/m.test(env)) {
    env += `USE_RLS_ROLE="false"\n`;
  }

  fs.writeFileSync(envPath, env);
  console.log("Wrote DATABASE_URL_RLS to .env (USE_RLS_ROLE remains false).");
  console.log("Run: npx tsx scripts/test-rls-runtime.ts");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
