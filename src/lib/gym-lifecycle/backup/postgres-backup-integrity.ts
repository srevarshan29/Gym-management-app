import type { BackupStorageAdapter } from "@/lib/gym-lifecycle/backup/backup-storage";
import type { TenantBackupArtifactEntry } from "@/lib/gym-lifecycle/backup/backup-format";
import { fingerprintRow, type PostgresRowFingerprint } from "@/lib/gym-lifecycle/backup/postgres-row-fingerprint";
import type { PostgresExportAdapter } from "@/lib/gym-lifecycle/backup/postgres-tenant-export";
import { exportSinglePostgresTableForTenant } from "@/lib/gym-lifecycle/backup/postgres-tenant-export";
import type { SourceEvidenceValidationResult } from "@/lib/gym-lifecycle/backup/backup-source-evidence";

type PostgresArtifactPayload = {
  table: string;
  rows: unknown[];
  rowCount: number;
};

function comparePostgresFingerprintMaps(
  table: string,
  exported: PostgresRowFingerprint[],
  live: PostgresRowFingerprint[],
  gymId: string,
): SourceEvidenceValidationResult {
  const exportedMap = new Map<string, PostgresRowFingerprint>();
  for (const row of exported) {
    if (exportedMap.has(row.rowId)) {
      return { ok: false, reason: `Duplicate postgres row id in export for ${table}: ${row.rowId}.` };
    }
    if (row.gymId != null && row.gymId !== gymId) {
      return {
        ok: false,
        reason: `Postgres export row in ${table} has wrong gymId (${row.gymId}).`,
      };
    }
    exportedMap.set(row.rowId, row);
  }

  const liveMap = new Map<string, PostgresRowFingerprint>();
  for (const row of live) {
    if (liveMap.has(row.rowId)) {
      return { ok: false, reason: `Duplicate postgres row id in live data for ${table}: ${row.rowId}.` };
    }
    liveMap.set(row.rowId, row);
  }

  for (const [id, liveRow] of liveMap) {
    const exp = exportedMap.get(id);
    if (!exp) {
      return { ok: false, reason: `Live postgres row missing from export (${table} id ${id}).` };
    }
    if (exp.contentHashSha256 !== liveRow.contentHashSha256) {
      return {
        ok: false,
        reason: `Postgres row content changed during backup (${table} id ${id}).`,
      };
    }
  }

  for (const id of exportedMap.keys()) {
    if (!liveMap.has(id)) {
      return { ok: false, reason: `Exported postgres row deleted before manifest (${table} id ${id}).` };
    }
  }

  if (exportedMap.size !== liveMap.size) {
    return {
      ok: false,
      reason: `Postgres row count mismatch for ${table} (export ${exportedMap.size}, live ${liveMap.size}).`,
    };
  }

  return { ok: true };
}

export function fingerprintsFromPostgresRows(table: string, rows: unknown[]): PostgresRowFingerprint[] {
  return rows.map((row, index) => fingerprintRow(table, row, index));
}

export async function verifyPostgresBackupIntegrity(input: {
  adapter: PostgresExportAdapter;
  storage: BackupStorageAdapter;
  gymId: string;
  artifacts: TenantBackupArtifactEntry[];
}): Promise<SourceEvidenceValidationResult & { tableCount?: number; rowCount?: number }> {
  const postgresArtifacts = input.artifacts.filter((a) => a.path.includes("/postgres/") && a.path.endsWith(".json"));
  let totalRows = 0;

  for (const artifact of postgresArtifacts) {
    const body = await input.storage.download(artifact.path);
    let payload: PostgresArtifactPayload;
    try {
      payload = JSON.parse(body.toString("utf8")) as PostgresArtifactPayload;
    } catch {
      return { ok: false, reason: `Postgres artifact is not valid JSON: ${artifact.path}` };
    }
    if (payload.rowCount !== payload.rows.length) {
      return {
        ok: false,
        reason: `Postgres artifact rowCount does not match rows array for ${payload.table}.`,
      };
    }
    if (artifact.recordCount !== payload.rowCount) {
      return {
        ok: false,
        reason: `Postgres artifact record count metadata mismatch for ${payload.table}.`,
      };
    }

    const exportedFps = fingerprintsFromPostgresRows(payload.table, payload.rows);
    const liveExport = await exportSinglePostgresTableForTenant(
      input.adapter,
      input.gymId,
      payload.table,
    );
    const liveFps = fingerprintsFromPostgresRows(payload.table, liveExport.rows);
    const cmp = comparePostgresFingerprintMaps(payload.table, exportedFps, liveFps, input.gymId);
    if (!cmp.ok) return cmp;
    totalRows += payload.rowCount;
  }

  return { ok: true, tableCount: postgresArtifacts.length, rowCount: totalRows };
}