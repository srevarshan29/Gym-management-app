/**
 * Read-only diagnostic: prove whether runtime Prisma and reconciliation scripts
 * hit the same Postgres database, and whether the reconciled Gym row exists.
 *
 * Usage:
 *   node --env-file=.env --import tsx scripts/diagnose-ledger-db.ts
 *   node --env-file=.env --import tsx scripts/diagnose-ledger-db.ts --gym-id c76365c49f4d4f75b7de161f3
 *
 * Does not modify any data.
 */
import { createSeedPrismaClient } from "../src/lib/seed/postgres-tenant-mirror";
import { prisma } from "../src/lib/prisma";
import {
  RECONCILED_FIRESTORE_GYM_ID,
  getPostgresConnectionFingerprint,
  getRuntimePrismaConnectionFingerprint,
  postgresIdentitiesMatch,
  safePostgresHost,
} from "../src/lib/ledger-diagnostics";

function readGymIdArg(): string {
  const gymIdArg = process.argv.find((arg, i) => process.argv[i - 1] === "--gym-id");
  return gymIdArg ?? RECONCILED_FIRESTORE_GYM_ID;
}

async function inspectGym(gymId: string) {
  const gym = await prisma.gym.findUnique({ where: { id: gymId } });
  const legacyGym = await prisma.gym.findUnique({
    where: { id: "gym_default_0000000001" },
  });
  const totalGyms = await prisma.gym.count();
  return {
    gymId,
    gymExists: gym !== null,
    gymName: gym?.name ?? null,
    legacyGymExists: legacyGym !== null,
    totalGyms,
  };
}

async function inspectGymWithClient(
  client: Pick<typeof prisma, "gym">,
  gymId: string,
) {
  const gym = await client.gym.findUnique({ where: { id: gymId } });
  const legacyGym = await client.gym.findUnique({
    where: { id: "gym_default_0000000001" },
  });
  const totalGyms = await client.gym.count();
  return {
    gymId,
    gymExists: gym !== null,
    gymName: gym?.name ?? null,
    legacyGymExists: legacyGym !== null,
    totalGyms,
  };
}

async function main() {
  const gymId = readGymIdArg();
  const reconciliationClient = createSeedPrismaClient();

  console.log("Ledger Postgres identity diagnostic (read-only)");
  console.log(`Target gymId: ${gymId}`);
  console.log(`USE_RLS_ROLE: ${process.env.USE_RLS_ROLE ?? "(unset)"}`);
  console.log(`VERCEL_ENV: ${process.env.VERCEL_ENV ?? "(unset)"}`);
  console.log("");

  try {
    const [runtimeFingerprint, reconciliationFingerprint, runtimeGym, reconciliationGym] =
      await Promise.all([
        getRuntimePrismaConnectionFingerprint(),
        getPostgresConnectionFingerprint(reconciliationClient, {
          connectionLabel: "reconciliation",
          configuredHost: safePostgresHost(
            process.env.DIRECT_URL ?? process.env.DATABASE_URL,
          ),
        }),
        inspectGym(gymId),
        inspectGymWithClient(reconciliationClient, gymId),
      ]);

    const identitiesMatch = postgresIdentitiesMatch(
      runtimeFingerprint,
      reconciliationFingerprint,
    );

    console.log(
      JSON.stringify(
        {
          runtimeConnection: runtimeFingerprint,
          reconciliationConnection: reconciliationFingerprint,
          identitiesMatch,
          runtimeGymLookup: runtimeGym,
          reconciliationGymLookup: reconciliationGym,
          scenarioIfLedgerFailsOnThisMachine: !identitiesMatch
            ? "A_different_postgres_database"
            : !runtimeGym.gymExists
              ? "B_gym_row_missing_in_connected_database"
              : "none_on_this_machine",
        },
        null,
        2,
      ),
    );
  } finally {
    await reconciliationClient.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
