import {
  DocumentReference,
  GeoPoint,
  Timestamp,
  type Firestore,
} from "firebase-admin/firestore";

import { sha256Hex } from "@/lib/gym-lifecycle/backup/checksum";

export class CanonicalSerializationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CanonicalSerializationError";
  }
}

export function sortValueKeys(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(sortValueKeys);
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      sorted[key] = sortValueKeys(record[key]);
    }
    return sorted;
  }
  return value;
}

/** Deterministic JSON for content hashing (canonical serialization v1). */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortValueKeys(value));
}

export function hashCanonicalPayload(value: unknown): string {
  return sha256Hex(canonicalJson(value));
}

export function canonicalizeFirestoreValue(value: unknown, db?: Firestore): unknown {
  if (value === null) return null;
  if (value === undefined) {
    throw new CanonicalSerializationError("undefined is not serializable.");
  }
  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean") return value;
  if (t === "bigint") {
    throw new CanonicalSerializationError("BigInt is not supported in canonical serialization.");
  }
  if (typeof value === "symbol" || typeof value === "function") {
    throw new CanonicalSerializationError(`Unsupported type: ${t}`);
  }
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    return { __firestore_type: "bytes", base64: Buffer.from(value).toString("base64") };
  }
  if (value instanceof Timestamp) {
    return { __firestore_type: "timestamp", iso: value.toDate().toISOString() };
  }
  if (value instanceof GeoPoint) {
    return {
      __firestore_type: "geopoint",
      latitude: value.latitude,
      longitude: value.longitude,
    };
  }
  if (value instanceof DocumentReference) {
    return { __firestore_type: "reference", path: value.path };
  }
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalizeFirestoreValue(entry, db));
  }
  if (typeof value === "object") {
    const maybeTs = value as { toDate?: () => Date };
    if (typeof maybeTs.toDate === "function") {
      return {
        __firestore_type: "timestamp",
        iso: maybeTs.toDate().toISOString(),
      };
    }
    const proto = Object.getPrototypeOf(value);
    if (proto !== null && proto !== Object.prototype) {
      throw new CanonicalSerializationError(
        `Unsupported object type: ${value.constructor?.name ?? "unknown"}`,
      );
    }
    const record = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      out[key] = canonicalizeFirestoreValue(record[key], db);
    }
    return out;
  }
  throw new CanonicalSerializationError(`Unsupported value type: ${t}`);
}

export function fingerprintFirestoreDocument(input: {
  path: string;
  collection: string;
  id: string;
  data: Record<string, unknown>;
}): string {
  const canonicalData = canonicalizeFirestoreValue(input.data);
  return hashCanonicalPayload({
    path: input.path,
    collection: input.collection,
    id: input.id,
    data: canonicalData,
  });
}