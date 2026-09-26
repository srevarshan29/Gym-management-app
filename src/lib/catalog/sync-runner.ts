import { sha256Hex } from "@/lib/catalog/hash";
import {
  loadCatalogBundleFiles,
  validateCatalogBundle,
} from "@/lib/catalog/bundle-validation";
import { syncCatalogMediaAssets } from "@/lib/catalog/catalog-media-sync";
import { collectMissingCatalogMediaAssetErrors } from "@/lib/catalog/catalog-media-population";
import { CATALOG_IMAGES_DIR } from "@/lib/catalog/paths";
import { formatCatalogSyncReport } from "@/lib/catalog/format-report";
import {
  buildCatalogSyncMetaDoc,
  validateCatalogSyncMetaDoc,
} from "@/lib/catalog/sync-meta-validation";
import {
  chunkCatalogSyncPlan,
  computeCatalogSyncPlan,
  type ExistingCatalogSnapshot,
} from "@/lib/catalog/sync-plan";
import {
  executeCatalogSyncWrite,
  type CatalogSyncWriterBackend,
} from "@/lib/catalog/sync-writer";
import type { CatalogSyncReport } from "@/lib/catalog/types";

export type CatalogSyncRunnerOptions = {
  dryRun?: boolean;
  manifestPath?: string;
  exercisesPath?: string;
  imagesRoot?: string;
  uploadMedia?: boolean;
  existingCatalog?: ExistingCatalogSnapshot[];
  backend?: CatalogSyncWriterBackend;
  environmentLabel?: string;
};

export class CatalogSyncWriteBackendRequiredError extends Error {
  constructor() {
    super("Catalog sync write mode requires a Firestore writer backend.");
    this.name = "CatalogSyncWriteBackendRequiredError";
  }
}

function emptyReport(dryRun: boolean): CatalogSyncReport {
  return {
    dryRun,
    catalogVersion: null,
    totalInputExercises: 0,
    validExercises: 0,
    invalidExercises: 0,
    duplicateCatalogIds: [],
    duplicateNameLowers: [],
    wouldCreate: 0,
    wouldUpdate: 0,
    wouldDeactivate: 0,
    unchanged: 0,
    batchesProcessed: 0,
    errors: [],
    warnings: [],
    failures: [],
  };
}

export async function runCatalogSync(
  options: CatalogSyncRunnerOptions = {},
): Promise<CatalogSyncReport> {
  const dryRun = options.dryRun ?? true;
  const startedAt = new Date().toISOString();

  if (!dryRun && !options.backend) {
    throw new CatalogSyncWriteBackendRequiredError();
  }

  const bundle = loadCatalogBundleFiles({
    manifestPath: options.manifestPath,
    exercisesPath: options.exercisesPath,
  });

  const totalInputExercises = Array.isArray(bundle.exercisesRaw)
    ? bundle.exercisesRaw.length
    : 0;

  const validation = validateCatalogBundle(bundle);
  if (!validation.ok) {
    const duplicateCatalogIds = validation.errors
      .filter((error) => error.startsWith('Duplicate catalogId "'))
      .map((error) => error.match(/"([^"]+)"/)?.[1])
      .filter((value): value is string => Boolean(value));
    const duplicateNameLowers = validation.errors
      .filter((error) => error.startsWith('Duplicate normalized name "'))
      .map((error) => error.match(/"([^"]+)"/)?.[1])
      .filter((value): value is string => Boolean(value));

    return {
      ...emptyReport(dryRun),
      catalogVersion:
        bundle.manifestRaw &&
        typeof bundle.manifestRaw === "object" &&
        typeof (bundle.manifestRaw as { catalogVersion?: unknown }).catalogVersion ===
          "string"
          ? ((bundle.manifestRaw as { catalogVersion: string }).catalogVersion ?? null)
          : null,
      totalInputExercises,
      validExercises: 0,
      invalidExercises: totalInputExercises,
      duplicateCatalogIds,
      duplicateNameLowers,
      errors: validation.errors,
      warnings: validation.warnings,
      failures: validation.failures,
      environment: options.environmentLabel,
    };
  }

  const existingCatalog = options.backend
    ? await options.backend.listExistingSnapshots()
    : (options.existingCatalog ?? []);

  const uploadMedia = options.uploadMedia ?? false;
  const imagesRoot = options.imagesRoot ?? CATALOG_IMAGES_DIR;

  if (uploadMedia && !dryRun) {
    const missingAssetErrors = collectMissingCatalogMediaAssetErrors(
      validation.exercises,
      imagesRoot,
    );
    if (missingAssetErrors.length > 0) {
      return {
        ...emptyReport(false),
        catalogVersion: validation.manifest.catalogVersion,
        totalInputExercises,
        validExercises: validation.exercises.length,
        invalidExercises: 0,
        duplicateCatalogIds: [],
        duplicateNameLowers: [],
        wouldCreate: 0,
        wouldUpdate: 0,
        wouldDeactivate: 0,
        unchanged: 0,
        batchesProcessed: 0,
        errors: missingAssetErrors,
        warnings: validation.warnings,
        failures: missingAssetErrors.map((message) => ({
          catalogId: null,
          phase: "media" as const,
          message,
        })),
        environment: options.environmentLabel,
      };
    }
  }

  const mediaSync = await syncCatalogMediaAssets({
    exercises: validation.exercises,
    imagesRoot,
    uploadMedia,
    dryRun,
  });

  const plan = computeCatalogSyncPlan(mediaSync.exercises, existingCatalog);
  const upsertAndDeactivateItems = plan.items.filter(
    (item) => item.action !== "unchanged",
  );
  const batches = chunkCatalogSyncPlan(upsertAndDeactivateItems);
  const jsonSha256 = sha256Hex(bundle.exercisesJson);

  if (dryRun) {
    return {
      dryRun: true,
      catalogVersion: validation.manifest.catalogVersion,
      totalInputExercises,
      validExercises: validation.exercises.length,
      invalidExercises: totalInputExercises - validation.exercises.length,
      duplicateCatalogIds: [],
      duplicateNameLowers: [],
      wouldCreate: plan.wouldCreate,
      wouldUpdate: plan.wouldUpdate,
      wouldDeactivate: plan.wouldDeactivate,
      unchanged: plan.unchanged,
      batchesProcessed: batches.length,
      mediaObjectCount: mediaSync.mediaObjectCount,
      mediaUploaded: mediaSync.uploaded,
      mediaSkipped: mediaSync.skipped,
      errors: [],
      warnings: validation.warnings,
      failures: mediaSync.failures,
      environment: options.environmentLabel,
    };
  }

  const writeResult = await executeCatalogSyncWrite({
    backend: options.backend!,
    plan,
    exercises: mediaSync.exercises,
  });

  if (!writeResult.ok) {
    return {
      dryRun: false,
      catalogVersion: validation.manifest.catalogVersion,
      totalInputExercises,
      validExercises: validation.exercises.length,
      invalidExercises: 0,
      duplicateCatalogIds: [],
      duplicateNameLowers: [],
      wouldCreate: plan.wouldCreate,
      wouldUpdate: plan.wouldUpdate,
      wouldDeactivate: plan.wouldDeactivate,
      unchanged: plan.unchanged,
      appliedCreate: writeResult.counts.created,
      appliedUpdate: writeResult.counts.updated,
      appliedDeactivate: writeResult.counts.deactivated,
      syncCompleted: false,
      batchesProcessed: batches.length,
      errors: writeResult.errors,
      warnings: validation.warnings,
      failures: writeResult.failures,
      environment: options.environmentLabel,
      mediaObjectCount: mediaSync.mediaObjectCount,
      mediaUploaded: mediaSync.uploaded,
      mediaSkipped: mediaSync.skipped,
    };
  }

  const finishedAt = new Date().toISOString();
  const metaDraft = buildCatalogSyncMetaDoc({
    manifestCatalogVersion: validation.manifest.catalogVersion,
    exerciseCount: validation.exercises.length,
    jsonSha256,
    dryRun: false,
    startedAt,
    finishedAt,
    created: writeResult.counts.created,
    updated: writeResult.counts.updated,
    deactivated: writeResult.counts.deactivated,
    unchanged: writeResult.counts.unchanged,
    failures: [...writeResult.failures, ...mediaSync.failures],
    warnings: validation.warnings,
    status:
      mediaSync.failures.length > 0 || writeResult.failures.length > 0
        ? "partial"
        : "complete",
    mediaObjectCount: mediaSync.mediaObjectCount,
  });

  const metaValidation = validateCatalogSyncMetaDoc(metaDraft);
  if (!metaValidation.ok) {
    return {
      dryRun: false,
      catalogVersion: validation.manifest.catalogVersion,
      totalInputExercises,
      validExercises: validation.exercises.length,
      invalidExercises: 0,
      duplicateCatalogIds: [],
      duplicateNameLowers: [],
      wouldCreate: plan.wouldCreate,
      wouldUpdate: plan.wouldUpdate,
      wouldDeactivate: plan.wouldDeactivate,
      unchanged: plan.unchanged,
      appliedCreate: writeResult.counts.created,
      appliedUpdate: writeResult.counts.updated,
      appliedDeactivate: writeResult.counts.deactivated,
      syncCompleted: false,
      batchesProcessed: batches.length,
      errors: [
        "Catalog exercises were written but sync metadata validation failed; catalogSyncMeta was not updated.",
        ...metaValidation.errors,
      ],
      warnings: validation.warnings,
      failures: metaValidation.errors.map((message) => ({
        catalogId: null,
        phase: "validation",
        message,
      })),
      environment: options.environmentLabel,
    };
  }

  await options.backend!.writeSyncMeta(metaValidation.meta);

  return {
    dryRun: false,
    catalogVersion: validation.manifest.catalogVersion,
    totalInputExercises,
    validExercises: validation.exercises.length,
    invalidExercises: 0,
    duplicateCatalogIds: [],
    duplicateNameLowers: [],
    wouldCreate: plan.wouldCreate,
    wouldUpdate: plan.wouldUpdate,
    wouldDeactivate: plan.wouldDeactivate,
    unchanged: plan.unchanged,
    appliedCreate: writeResult.counts.created,
    appliedUpdate: writeResult.counts.updated,
    appliedDeactivate: writeResult.counts.deactivated,
    syncCompleted: true,
    batchesProcessed: batches.length,
    errors: [],
    warnings: validation.warnings,
    failures: mediaSync.failures,
    environment: options.environmentLabel,
    mediaObjectCount: mediaSync.mediaObjectCount,
    mediaUploaded: mediaSync.uploaded,
    mediaSkipped: mediaSync.skipped,
  };
}

export function formatSyncReport(report: CatalogSyncReport): string {
  return formatCatalogSyncReport(report);
}

export { CATALOG_SYNC_BATCH_SIZE } from "@/lib/catalog/sync-plan";
