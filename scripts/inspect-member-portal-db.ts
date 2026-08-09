import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PORTAL_COLUMNS = [
  "portalEnabledAt",
  "ageYears",
  "heightCm",
  "weightKg",
] as const;

const REMOVED_COLUMNS = [
  "passwordHash",
  "portalSetupToken",
  "portalSetupTokenExpiresAt",
  "phoneDigits",
] as const;

async function main() {
  const columns = await prisma.$queryRaw<
    { column_name: string; data_type: string; udt_name: string }[]
  >`
    SELECT column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Member'
    ORDER BY ordinal_position
  `;

  const columnNames = new Set(columns.map((c) => c.column_name));

  console.log("=== Portal columns (expected present) ===");
  for (const name of PORTAL_COLUMNS) {
    console.log(`  ${name}: ${columnNames.has(name) ? "PRESENT" : "MISSING"}`);
  }

  console.log("\n=== Removed phone/password portal columns (should be absent) ===");
  for (const name of REMOVED_COLUMNS) {
    console.log(`  ${name}: ${columnNames.has(name) ? "STILL_PRESENT" : "absent"}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
