import { hashCanonicalPayload } from "@/lib/gym-lifecycle/backup/firestore-canonical";

export type PostgresRowFingerprint = {
  table: string;
  rowId: string;
  contentHashSha256: string;
  gymId: string | null;
};

function rowId(row: unknown, fallbackIndex: number): string {
  if (typeof row === "object" && row !== null && "id" in row) {
    const id = (row as { id?: unknown }).id;
    if (typeof id === "string" || typeof id === "number") return String(id);
  }
  return `row-${fallbackIndex}`;
}

export function fingerprintRow(table: string, row: unknown, index: number): PostgresRowFingerprint {
  const gymId =
    typeof row === "object" && row !== null && "gymId" in row
      ? ((row as { gymId?: string | null }).gymId ?? null)
      : null;
  return {
    table,
    rowId: rowId(row, index),
    gymId,
    contentHashSha256: hashCanonicalPayload({ table, row }),
  };
}
