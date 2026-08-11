import { PrismaClient } from "@prisma/client";
import { prisma as appPrisma } from "../src/lib/prisma";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const parsed = new URL(url.replace(/^postgresql:/, "postgres:"));
console.log("host:", parsed.hostname);
console.log("port:", parsed.port || "5432");
console.log("USE_RLS_ROLE:", process.env.USE_RLS_ROLE ?? "(unset)");

const prisma = new PrismaClient({ datasources: { db: { url } } });
const started = Date.now();

prisma
  .$queryRaw`SELECT 1 AS ok`
  .then((row) => {
    console.log("DB reachable in", Date.now() - started, "ms", row);
  })
  .catch((error: Error) => {
    console.error("DB unreachable in", Date.now() - started, "ms");
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await appPrisma.$queryRaw`SELECT 1 AS ok`
      .then(() => console.log("app prisma.ts client: ok"))
      .catch((error: Error) => {
        console.error("app prisma.ts client: fail");
        console.error(error.message);
        process.exitCode = 1;
      })
      .finally(() => appPrisma.$disconnect());
  });
