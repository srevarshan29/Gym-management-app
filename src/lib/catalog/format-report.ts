import type { CatalogSyncReport } from "@/lib/catalog/types";
import { CATALOG_SYNC_BATCH_SIZE } from "@/lib/catalog/sync-plan";

export function formatCatalogSyncReport(report: CatalogSyncReport): string {
  const lines = [
    "Catalog sync report",
    "===================",
    `Mode: ${report.dryRun ? "DRY RUN (no Firestore writes)" : "WRITE"}`,
    `Catalog version: ${report.catalogVersion ?? "(none)"}`,
  ];

  if (report.environment) {
    lines.push("", report.environment);
  }

  lines.push(
    "",
    "Input summary",
    `  Total input exercises: ${report.totalInputExercises}`,
    `  Valid exercises:       ${report.validExercises}`,
    `  Invalid exercises:     ${report.invalidExercises}`,
    `  Duplicate catalog IDs: ${report.duplicateCatalogIds.length}`,
    `  Duplicate names:       ${report.duplicateNameLowers.length}`,
    "",
    report.dryRun ? "Planned changes" : "Sync results",
    `  Would create:      ${report.wouldCreate}`,
    `  Would update:      ${report.wouldUpdate}`,
    `  Would deactivate:  ${report.wouldDeactivate}`,
    `  Unchanged:         ${report.unchanged}`,
  );

  if (!report.dryRun) {
    lines.push(
      `  Applied create:    ${report.appliedCreate ?? 0}`,
      `  Applied update:    ${report.appliedUpdate ?? 0}`,
      `  Applied deactivate:${report.appliedDeactivate ?? 0}`,
      `  Sync completed:    ${report.syncCompleted ? "yes" : "no"}`,
    );
  }

  lines.push(
    `  Batches processed: ${report.batchesProcessed} (batch size ${CATALOG_SYNC_BATCH_SIZE})`,
  );

  if (report.duplicateCatalogIds.length > 0) {
    lines.push("", "Duplicate catalog IDs:", ...report.duplicateCatalogIds.map((id) => `  - ${id}`));
  }

  if (report.duplicateNameLowers.length > 0) {
    lines.push("", "Duplicate normalized names:", ...report.duplicateNameLowers.map((name) => `  - ${name}`));
  }

  if (report.warnings.length > 0) {
    lines.push("", "Warnings:", ...report.warnings.map((warning) => `  - ${warning}`));
  }

  if (report.errors.length > 0) {
    lines.push("", "Errors:", ...report.errors.map((error) => `  - ${error}`));
  }

  if (report.failures.length > 0) {
    lines.push(
      "",
      "Failures:",
      ...report.failures.map(
        (failure) =>
          `  - [${failure.phase}] ${failure.catalogId ?? "(bundle)"}: ${failure.message}`,
      ),
    );
  }

  lines.push(
    "",
    report.errors.length === 0
      ? report.dryRun
        ? "Validation status: PASSED"
        : report.syncCompleted
          ? "Sync status: COMPLETE"
          : "Sync status: FAILED"
      : "Validation status: FAILED",
  );

  return lines.join("\n");
}
