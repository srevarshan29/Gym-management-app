/**
 * Read-only catalog sync preflight — compares local bundle to live Firestore.
 *
 * Usage:
 *   node --env-file=.env --import tsx scripts/catalog-sync-preflight.ts
 *   node --env-file=.env --import tsx scripts/catalog-sync-preflight.ts --output data/catalog/sync-preflight-report.json
 *
 * Does not write to Firestore, Supabase, or catalogSyncMeta.
 */
import { resolve } from "node:path";

import {
  DEFAULT_PREFLIGHT_REPORT_PATH,
  formatCatalogSyncPreflightSummary,
  runCatalogSyncPreflight,
  writeCatalogSyncPreflightReport,
} from "../src/lib/catalog/catalog-sync-preflight";
import { formatCatalogSyncEnvironment } from "../src/lib/catalog/format-environment";
import { resolveCatalogSyncEnvironment } from "../src/lib/catalog/sync-environment";
import { getFirestoreDb } from "../src/lib/firebase/admin";

function parseArgs(argv: string[]): { outputPath: string } {
  let outputPath = DEFAULT_PREFLIGHT_REPORT_PATH;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--output" && argv[i + 1]) {
      outputPath = resolve(argv[i + 1]!);
      i += 1;
    }
  }
  return { outputPath };
}

async function main() {
  const env = resolveCatalogSyncEnvironment();
  if (!env.projectId) {
    console.error(
      "FIREBASE_PROJECT_ID is not set. Load .env and verify the target project before preflight.",
    );
    process.exit(2);
  }

  console.log(formatCatalogSyncEnvironment(env));
  console.log("");
  console.log("Reading Firestore (read-only)...");

  let db;
  try {
    db = getFirestoreDb();
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "Failed to initialize Firestore.",
    );
    process.exit(2);
  }

  const { outputPath } = parseArgs(process.argv.slice(2));

  let report;
  try {
    report = await runCatalogSyncPreflight({ db, environment: env });
  } catch (error) {
    console.error(
      "Preflight read failed:",
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }

  if (!report.ok) {
    console.error(report.error ?? "Bundle validation failed.");
    process.exit(1);
  }

  writeCatalogSyncPreflightReport(report, outputPath);
  console.log(formatCatalogSyncPreflightSummary(report));
  console.log("");
  console.log(`Full JSON report: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});