import { createHash, randomBytes } from "crypto";
import { Timestamp, type Firestore } from "firebase-admin/firestore";

import { COLLECTIONS } from "@/lib/firestore/collections";
import { getFirestoreDb } from "@/lib/firestore";
import { serverTimestamps } from "@/lib/firestore/serialize";

export const GYM_EXPORT_DOWNLOAD_TTL_MS = 15 * 60 * 1000;
export const GYM_EXPORT_ARTIFACT_AVAILABILITY_MS = 24 * 60 * 60 * 1000;

export type ExportDownloadTokenRecord = {
  gymId: string;
  exportId: string;
  artifactPath: string;
  checksumSha256: string;
  issuedToUserId: string;
  expiresAt: Timestamp;
  consumedAt: Timestamp | null;
  revokedAt: Timestamp | null;
};

export type IssuedExportDownloadToken = {
  bearerToken: string;
  tokenDocId: string;
  expiresAtMs: number;
};

export type RedeemExportDownloadTokenInput = {
  bearerToken: string;
  gymId: string;
  exportId: string;
  superAdminUserId: string;
  now?: Date;
};

export type RedeemExportDownloadTokenResult =
  | {
      ok: true;
      artifactPath: string;
      checksumSha256: string;
    }
  | { ok: false; error: string };

export function hashExportDownloadBearerToken(bearerToken: string): string {
  return createHash("sha256").update(bearerToken, "utf8").digest("hex");
}

export function generateExportDownloadBearerToken(): string {
  return randomBytes(32).toString("hex");
}

export interface ExportDownloadTokenStore {
  issue(input: {
    gymId: string;
    exportId: string;
    artifactPath: string;
    checksumSha256: string;
    issuedToUserId: string;
    now?: Date;
  }): Promise<IssuedExportDownloadToken>;

  redeem(input: RedeemExportDownloadTokenInput): Promise<RedeemExportDownloadTokenResult>;
}

type MemoryTokenDoc = ExportDownloadTokenRecord;

export type SharedExportDownloadTokenMemory = {
  docs: Map<string, MemoryTokenDoc>;
};

export function createSharedExportDownloadTokenMemory(): SharedExportDownloadTokenMemory {
  return { docs: new Map() };
}

/** In-memory store (tests) — multiple instances can share one `SharedExportDownloadTokenMemory`. */
export class MemoryExportDownloadTokenStore implements ExportDownloadTokenStore {
  constructor(private readonly shared: SharedExportDownloadTokenMemory) {}

  async issue(input: {
    gymId: string;
    exportId: string;
    artifactPath: string;
    checksumSha256: string;
    issuedToUserId: string;
    now?: Date;
  }): Promise<IssuedExportDownloadToken> {
    const now = input.now ?? new Date();
    const bearerToken = generateExportDownloadBearerToken();
    const tokenDocId = hashExportDownloadBearerToken(bearerToken);
    const expiresAt = Timestamp.fromMillis(now.getTime() + GYM_EXPORT_DOWNLOAD_TTL_MS);
    this.shared.docs.set(tokenDocId, {
      gymId: input.gymId,
      exportId: input.exportId,
      artifactPath: input.artifactPath,
      checksumSha256: input.checksumSha256,
      issuedToUserId: input.issuedToUserId,
      expiresAt,
      consumedAt: null,
      revokedAt: null,
    });
    return {
      bearerToken,
      tokenDocId,
      expiresAtMs: expiresAt.toMillis(),
    };
  }

  async redeem(input: RedeemExportDownloadTokenInput): Promise<RedeemExportDownloadTokenResult> {
    const now = input.now ?? new Date();
    const tokenDocId = hashExportDownloadBearerToken(input.bearerToken);
    const doc = this.shared.docs.get(tokenDocId);
    if (!doc) return { ok: false, error: "Download authorization is invalid or expired." };
    if (doc.revokedAt) return { ok: false, error: "Download authorization was revoked." };
    if (doc.consumedAt) return { ok: false, error: "Download authorization was already used." };
    if (doc.gymId !== input.gymId) {
      return { ok: false, error: "Download authorization does not match this gym." };
    }
    if (doc.exportId !== input.exportId) {
      return { ok: false, error: "Download authorization does not match this export." };
    }
    if (doc.issuedToUserId !== input.superAdminUserId) {
      return { ok: false, error: "Download authorization was issued to another administrator." };
    }
    if (doc.expiresAt.toMillis() <= now.getTime()) {
      return { ok: false, error: "Download authorization has expired." };
    }
    doc.consumedAt = Timestamp.fromDate(now);
    return {
      ok: true,
      artifactPath: doc.artifactPath,
      checksumSha256: doc.checksumSha256,
    };
  }
}

export class FirestoreExportDownloadTokenStore implements ExportDownloadTokenStore {
  constructor(private readonly db: Firestore) {}

  private col() {
    return this.db.collection(COLLECTIONS.gymDataExportDownloadTokens);
  }

  async issue(input: {
    gymId: string;
    exportId: string;
    artifactPath: string;
    checksumSha256: string;
    issuedToUserId: string;
    now?: Date;
  }): Promise<IssuedExportDownloadToken> {
    const now = input.now ?? new Date();
    const bearerToken = generateExportDownloadBearerToken();
    const tokenDocId = hashExportDownloadBearerToken(bearerToken);
    const expiresAt = Timestamp.fromMillis(now.getTime() + GYM_EXPORT_DOWNLOAD_TTL_MS);
    const ts = Timestamp.fromDate(now);
    await this.col()
      .doc(tokenDocId)
      .set({
        gymId: input.gymId,
        exportId: input.exportId,
        artifactPath: input.artifactPath,
        checksumSha256: input.checksumSha256,
        issuedToUserId: input.issuedToUserId,
        expiresAt,
        consumedAt: null,
        revokedAt: null,
        ...serverTimestamps(ts),
      } satisfies ExportDownloadTokenRecord & { createdAt: Timestamp; updatedAt: Timestamp });
    return { bearerToken, tokenDocId, expiresAtMs: expiresAt.toMillis() };
  }

  async redeem(input: RedeemExportDownloadTokenInput): Promise<RedeemExportDownloadTokenResult> {
    const now = input.now ?? new Date();
    const tokenDocId = hashExportDownloadBearerToken(input.bearerToken);
    const ref = this.col().doc(tokenDocId);

    return this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) {
        return { ok: false, error: "Download authorization is invalid or expired." };
      }
      const doc = snap.data() as ExportDownloadTokenRecord;
      if (doc.revokedAt) return { ok: false, error: "Download authorization was revoked." };
      if (doc.consumedAt) return { ok: false, error: "Download authorization was already used." };
      if (doc.gymId !== input.gymId) {
        return { ok: false, error: "Download authorization does not match this gym." };
      }
      if (doc.exportId !== input.exportId) {
        return { ok: false, error: "Download authorization does not match this export." };
      }
      if (doc.issuedToUserId !== input.superAdminUserId) {
        return { ok: false, error: "Download authorization was issued to another administrator." };
      }
      if (doc.expiresAt.toMillis() <= now.getTime()) {
        return { ok: false, error: "Download authorization has expired." };
      }

      tx.update(ref, {
        consumedAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.now(),
      });

      return {
        ok: true,
        artifactPath: doc.artifactPath,
        checksumSha256: doc.checksumSha256,
      };
    });
  }
}

let tokenStoreOverride: ExportDownloadTokenStore | null = null;

export function setExportDownloadTokenStoreForTests(store: ExportDownloadTokenStore | null): void {
  tokenStoreOverride = store;
}

export function getExportDownloadTokenStore(): ExportDownloadTokenStore {
  if (tokenStoreOverride) return tokenStoreOverride;
  return new FirestoreExportDownloadTokenStore(getFirestoreDb());
}