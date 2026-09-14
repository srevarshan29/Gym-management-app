import { FieldValue, Timestamp } from "firebase-admin/firestore";

/**
 * Recursively remove `undefined` values before any Firestore write.
 * Never pass undefined to Firestore (dev.md rule #2).
 */
export function omitUndefined<T>(value: T): T {
  if (value === undefined) {
    return value;
  }
  if (value === null) {
    return value;
  }
  if (value instanceof Timestamp || value instanceof Date) {
    return value;
  }
  if (value instanceof FieldValue) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => omitUndefined(item)) as T;
  }
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (entry !== undefined) {
        result[key] = omitUndefined(entry);
      }
    }
    return result as T;
  }
  return value;
}

/** Coerce optional string fields: undefined → null for explicit null storage. */
export function nullishString(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/** Server timestamps for create/update payloads. */
export function serverTimestamps(now: Timestamp = Timestamp.now()) {
  return { createdAt: now, updatedAt: now };
}

export function touchUpdatedAt(now: Timestamp = Timestamp.now()) {
  return { updatedAt: now };
}
