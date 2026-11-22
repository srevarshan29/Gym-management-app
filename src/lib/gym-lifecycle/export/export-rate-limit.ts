import { Timestamp } from "firebase-admin/firestore";

import { COLLECTIONS } from "@/lib/firestore/collections";
import { getFirestoreDb } from "@/lib/firestore";

export const GYM_EXPORT_RUN_LIMIT = 3;
export const GYM_EXPORT_RUN_WINDOW_MS = 60 * 60 * 1000;
export const GYM_EXPORT_DOWNLOAD_LIMIT = 10;
export const GYM_EXPORT_DOWNLOAD_WINDOW_MS = 60 * 60 * 1000;

export type ExportRateLimitKind = "export_run" | "export_download";

type RateDoc = {
  count: number;
  windowStartedAt: Timestamp;
};

type MemoryRateState = Map<string, RateDoc>;

const memoryRates = new Map<string, MemoryRateState>();
let useMemoryRatesForTests = false;

export function setExportRateLimitMemoryModeForTests(enabled: boolean): void {
  useMemoryRatesForTests = enabled;
  if (enabled) memoryRates.clear();
}

function throttleKey(kind: ExportRateLimitKind, scopeId: string): string {
  return `${kind}:${scopeId}`;
}

function windowMs(kind: ExportRateLimitKind): number {
  return kind === "export_run" ? GYM_EXPORT_RUN_WINDOW_MS : GYM_EXPORT_DOWNLOAD_WINDOW_MS;
}

function limitFor(kind: ExportRateLimitKind): number {
  return kind === "export_run" ? GYM_EXPORT_RUN_LIMIT : GYM_EXPORT_DOWNLOAD_LIMIT;
}

export async function assertExportRateLimit(input: {
  kind: ExportRateLimitKind;
  scopeId: string;
  now?: Date;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const now = input.now ?? new Date();
  const max = limitFor(input.kind);
  const winMs = windowMs(input.kind);
  const key = throttleKey(input.kind, input.scopeId);

  if (useMemoryRatesForTests) {
    const bucket = memoryRates.get(key) ?? new Map();
    memoryRates.set(key, bucket);
    const doc = bucket.get("rate");
    if (!doc || now.getTime() - doc.windowStartedAt.toMillis() >= winMs) {
      bucket.set("rate", {
        count: 1,
        windowStartedAt: Timestamp.fromDate(now),
      });
      return { ok: true };
    }
    if (doc.count >= max) {
      return { ok: false, error: "Too many export requests. Try again later." };
    }
    doc.count += 1;
    return { ok: true };
  }

  const db = getFirestoreDb();
  const ref = db.collection(COLLECTIONS.gymDataExportRateLimits).doc(key);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const startedAt = Timestamp.fromDate(now);
    if (!snap.exists) {
      tx.set(ref, { count: 1, windowStartedAt: startedAt, updatedAt: startedAt });
      return { ok: true as const };
    }
    const data = snap.data() as RateDoc;
    if (now.getTime() - data.windowStartedAt.toMillis() >= winMs) {
      tx.set(ref, { count: 1, windowStartedAt: startedAt, updatedAt: startedAt });
      return { ok: true as const };
    }
    if (data.count >= max) {
      return { ok: false as const, error: "Too many export requests. Try again later." };
    }
    tx.update(ref, { count: data.count + 1, updatedAt: startedAt });
    return { ok: true as const };
  });
}