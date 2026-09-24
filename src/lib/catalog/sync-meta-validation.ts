import type { CatalogSyncMetaDoc, CatalogSyncStatus } from "@/lib/catalog/types";
import { CATALOG_SYNC_SCRIPT_VERSION } from "@/lib/catalog/sync-version";

const SYNC_STATUS_VALUES = ["complete", "partial", "pending"] as const satisfies readonly CatalogSyncStatus[];

export type CatalogSyncMetaValidationResult =
  | { ok: true; meta: CatalogSyncMetaDoc }
  | { ok: false; errors: string[] };

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isSha256Hex(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);
}

function isSyncStatus(value: unknown): value is CatalogSyncStatus {
  return (
    typeof value === "string" &&
    (SYNC_STATUS_VALUES as readonly string[]).includes(value)
  );
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

export function validateCatalogSyncMetaDoc(input: unknown): CatalogSyncMetaValidationResult {
  const errors: string[] = [];

  if (input == null || typeof input !== "object") {
    return { ok: false, errors: ["catalogSyncMeta must be a JSON object."] };
  }

  const raw = input as Record<string, unknown>;

  if (!isNonEmptyString(raw.catalogVersion)) {
    errors.push("catalogSyncMeta.catalogVersion is required.");
  }
  if (
    typeof raw.exerciseCount !== "number" ||
    !Number.isInteger(raw.exerciseCount) ||
    raw.exerciseCount < 0
  ) {
    errors.push("catalogSyncMeta.exerciseCount must be a non-negative integer.");
  }
  if (!isSha256Hex(raw.jsonSha256)) {
    errors.push("catalogSyncMeta.jsonSha256 must be a 64-character SHA-256 hex digest.");
  }
  if (
    typeof raw.mediaObjectCount !== "number" ||
    !Number.isInteger(raw.mediaObjectCount) ||
    raw.mediaObjectCount < 0
  ) {
    errors.push("catalogSyncMeta.mediaObjectCount must be a non-negative integer.");
  }
  if (!isIsoTimestamp(raw.syncedAt)) {
    errors.push("catalogSyncMeta.syncedAt must be an ISO-8601 timestamp string.");
  }
  if (!isSyncStatus(raw.status)) {
    errors.push("catalogSyncMeta.status must be complete, partial, or pending.");
  }

  if (raw.lastRun == null || typeof raw.lastRun !== "object") {
    errors.push("catalogSyncMeta.lastRun is required.");
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const lastRunRaw = raw.lastRun as Record<string, unknown>;
  if (typeof lastRunRaw.dryRun !== "boolean") {
    errors.push("catalogSyncMeta.lastRun.dryRun must be a boolean.");
  }
  if (!isIsoTimestamp(lastRunRaw.startedAt)) {
    errors.push("catalogSyncMeta.lastRun.startedAt must be an ISO-8601 timestamp string.");
  }
  if (!isIsoTimestamp(lastRunRaw.finishedAt)) {
    errors.push("catalogSyncMeta.lastRun.finishedAt must be an ISO-8601 timestamp string.");
  }

  for (const field of ["created", "updated", "deactivated", "unchanged"] as const) {
    if (
      typeof lastRunRaw[field] !== "number" ||
      !Number.isInteger(lastRunRaw[field]) ||
      (lastRunRaw[field] as number) < 0
    ) {
      errors.push(`catalogSyncMeta.lastRun.${field} must be a non-negative integer.`);
    }
  }

  if (!isNonEmptyString(lastRunRaw.scriptVersion)) {
    errors.push("catalogSyncMeta.lastRun.scriptVersion is required.");
  }
  if (!Array.isArray(lastRunRaw.failures)) {
    errors.push("catalogSyncMeta.lastRun.failures must be an array.");
  }
  if (!Array.isArray(lastRunRaw.warnings)) {
    errors.push("catalogSyncMeta.lastRun.warnings must be an array.");
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    meta: raw as unknown as CatalogSyncMetaDoc,
  };
}

export function buildCatalogSyncMetaDoc(options: {
  manifestCatalogVersion: string;
  exerciseCount: number;
  jsonSha256: string;
  dryRun: boolean;
  startedAt: string;
  finishedAt: string;
  created: number;
  updated: number;
  deactivated: number;
  unchanged: number;
  failures: CatalogSyncMetaDoc["lastRun"]["failures"];
  warnings: string[];
  status?: CatalogSyncStatus;
  mediaObjectCount?: number;
}): CatalogSyncMetaDoc {
  return {
    catalogVersion: options.manifestCatalogVersion,
    exerciseCount: options.exerciseCount,
    jsonSha256: options.jsonSha256.toLowerCase(),
    mediaObjectCount: options.mediaObjectCount ?? 0,
    syncedAt: options.finishedAt,
    status: options.status ?? (options.failures.length > 0 ? "partial" : "pending"),
    lastRun: {
      dryRun: options.dryRun,
      startedAt: options.startedAt,
      finishedAt: options.finishedAt,
      created: options.created,
      updated: options.updated,
      deactivated: options.deactivated,
      unchanged: options.unchanged,
      failures: options.failures,
      warnings: options.warnings,
      scriptVersion: CATALOG_SYNC_SCRIPT_VERSION,
    },
  };
}

/** @deprecated Use buildCatalogSyncMetaDoc */
export const buildPendingCatalogSyncMetaDraft = buildCatalogSyncMetaDoc;
