import { createHash } from "crypto";

import type { GymTenantInventory } from "@/lib/gym-lifecycle/purge/inventory";
import { validateTenantBackupStorageConfig } from "@/lib/gym-lifecycle/backup/config";

export type FinancialArchiveSlice = {
  gymId: string;
  payments: unknown[];
  receipts: unknown[];
  ledgerTransactions: unknown[];
  subscriptions: unknown[];
};

export type TenantBackupPayload = {
  gymId: string;
  createdAt: string;
  inventory: GymTenantInventory;
  financial: FinancialArchiveSlice;
  gymSnapshot: Record<string, unknown> | null;
};

export type TenantBackupResult = {
  artifactRef: string;
  checksum: string;
  sizeBytes: number;
  createdAt: Date;
};

export type TenantBackupWriter = {
  write: (params: {
    gymId: string;
    objectPath: string;
    body: Buffer;
    contentType: string;
  }) => Promise<void>;
};

export async function buildTenantBackupPayload(input: {
  gymId: string;
  inventory: GymTenantInventory;
  financial: FinancialArchiveSlice;
  gymSnapshot: Record<string, unknown> | null;
}): Promise<TenantBackupPayload> {
  return {
    gymId: input.gymId,
    createdAt: new Date().toISOString(),
    inventory: input.inventory,
    financial: input.financial,
    gymSnapshot: input.gymSnapshot,
  };
}

export function checksumTenantBackup(body: Buffer): string {
  return createHash("sha256").update(body).digest("hex");
}

export function verifyTenantBackupChecksum(body: Buffer, expected: string): boolean {
  return checksumTenantBackup(body) === expected.trim();
}

export async function writeTenantBackupArtifact(
  gymId: string,
  payload: TenantBackupPayload,
  writer?: TenantBackupWriter,
): Promise<TenantBackupResult> {
  const validation = validateTenantBackupStorageConfig();
  if (!validation.ok && !writer) {
    throw new Error(validation.error);
  }

  const body = Buffer.from(JSON.stringify(payload), "utf8");
  const checksum = checksumTenantBackup(body);
  const objectPath = `tenant-backups/${gymId}/${payload.createdAt.replace(/[:.]/g, "-")}.json`;
  const artifactRef = `supabase://${validation.ok ? validation.config.bucket : "test"}/${objectPath}`;

  if (writer) {
    await writer.write({
      gymId,
      objectPath,
      body,
      contentType: "application/json",
    });
  } else if (validation.ok) {
    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient(validation.config.url, validation.config.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await client.storage
      .from(validation.config.bucket)
      .upload(objectPath, body, {
        contentType: "application/json",
        upsert: false,
      });
    if (error) {
      throw new Error(`Failed to upload tenant backup: ${error.message}`);
    }
  }

  return {
    artifactRef,
    checksum,
    sizeBytes: body.byteLength,
    createdAt: new Date(payload.createdAt),
  };
}