import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env");
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    let value = trimmed.slice(eq + 1);
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] ??= value;
  }
}

async function test(label: string, url: string) {
  const prisma = new PrismaClient({
    datasources: { db: { url } },
  });
  try {
    const result = await prisma.$queryRaw<{ ok: number }[]>`SELECT 1 as ok`;
    console.log(`${label}: OK`, result[0]?.ok);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`${label}: FAIL`, message.replace(/\s+/g, " ").slice(0, 160));
  } finally {
    await prisma.$disconnect();
  }
}

loadEnv();

const poolerBase = process.env.DATABASE_URL ?? "";
const rlsUrl = process.env.DATABASE_URL_RLS ?? "";
const directUrl = process.env.DIRECT_URL ?? "";

function toSessionPooler(url: string, username: string, password: string): string {
  const source = new URL(poolerBase.replace(/^postgresql:/, "postgres:"));
  const target = new URL(url.replace(/^postgresql:/, "postgres:"));
  source.port = "5432";
  source.username = username;
  source.password = password;
  source.pathname = target.pathname || "/postgres";
  source.searchParams.delete("pgbouncer");
  return source.toString().replace(/^postgres:/, "postgresql:");
}

async function main() {
  await test("DATABASE_URL (txn pooler 6543)", poolerBase);
  await test("DIRECT_URL (db host 5432)", directUrl);

  if (rlsUrl) {
    await test("DATABASE_URL_RLS (direct)", rlsUrl);
    const rls = new URL(rlsUrl.replace(/^postgresql:/, "postgres:"));
    const sessionUrl = toSessionPooler(
      rlsUrl,
      rls.username,
      rls.password,
    );
    await test("DATABASE_URL_RLS (session pooler 5432)", sessionUrl);
  }

  const pooler = new URL(poolerBase.replace(/^postgresql:/, "postgres:"));
  pooler.port = "5432";
  pooler.searchParams.delete("pgbouncer");
  await test("DATABASE_URL (session pooler 5432 postgres)", pooler.toString().replace(/^postgres:/, "postgresql:"));
}

main();
