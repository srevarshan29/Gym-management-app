/**
 * Validate bundled catalog source files and optionally upsert into Firestore.
 *
 * Usage:
 *   npx tsx scripts/catalog-sync.ts
 *   npx tsx scripts/catalog-sync.ts --dry-run
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npx tsx scripts/catalog-sync.ts --write --confirm-write
 *
 * Default: dry-run (no Firestore writes).
 * Write mode requires --write --confirm-write and either the Firestore emulator
 * or CATALOG_SYNC_ALLOW_PRODUCTION=true.
 */
import { getFirestoreDb } from "../src/lib/firebase/admin";
import { formatCatalogSyncEnvironment } from "../src/lib/catalog/format-environment";
import {
  assertCatalogSyncWriteConfirmed,
  assertCatalogSyncWriteEnvironment,
  parseCatalogSyncCliArgs,
  resolveCatalogSyncEnvironment,
  CatalogSyncProductionBlockedError,
  CatalogSyncWriteNotConfirmedError,
} from "../src/lib/catalog/sync-environment";
import {
  formatSyncReport,
  runCatalogSync,
  CatalogSyncWriteBackendRequiredError,
} from "../src/lib/catalog/sync-runner";
import { FirestoreCatalogSyncWriterBackend } from "../src/lib/catalog/sync-writer";

async function main() {
  const args = parseCatalogSyncCliArgs(process.argv.slice(2));

  if (args.help) {
    console.log(`Usage: npx tsx scripts/catalog-sync.ts [--dry-run] [--write --confirm-write]

Options:
  --dry-run        Validate bundle and print sync plan without Firestore writes (default)
  --write          Enable Firestore upserts (requires --confirm-write)
  --confirm-write  Explicit safeguard for write mode
  --help           Show this help text

Write safeguards:
  - Write mode never runs by default.
  - Writes are blocked outside the Firestore emulator unless
    CATALOG_SYNC_ALLOW_PRODUCTION=true is set.
  - Project/emulator information is printed before any write.
`);
    process.exit(0);
  }

  const environment = resolveCatalogSyncEnvironment();
  const environmentLabel = formatCatalogSyncEnvironment(environment);

  try {
    if (args.writeRequested) {
      assertCatalogSyncWriteConfirmed(args);
      assertCatalogSyncWriteEnvironment(environment);
      console.log(environmentLabel);
      console.log("");
    }

    const report = await runCatalogSync({
      dryRun: args.dryRun,
      backend: args.dryRun
        ? undefined
        : new FirestoreCatalogSyncWriterBackend(getFirestoreDb()),
      environmentLabel: args.writeRequested ? environmentLabel : undefined,
    });

    console.log(formatSyncReport(report));
    process.exit(report.errors.length > 0 ? 1 : 0);
  } catch (error) {
    if (
      error instanceof CatalogSyncWriteNotConfirmedError ||
      error instanceof CatalogSyncProductionBlockedError ||
      error instanceof CatalogSyncWriteBackendRequiredError
    ) {
      console.error(error.message);
      process.exit(2);
    }
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
