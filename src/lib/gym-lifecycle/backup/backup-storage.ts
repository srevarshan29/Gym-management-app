import { validateTenantBackupStorageConfig } from "@/lib/gym-lifecycle/backup/config";
import { sha256Hex } from "@/lib/gym-lifecycle/backup/checksum";

export type BackupStorageWriteResult = {
  path: string;
  checksumSha256: string;
  sizeBytes: number;
};

export type BackupStorageAdapter = {
  upload: (input: {
    objectPath: string;
    body: Buffer;
    contentType: string;
    upsert?: boolean;
  }) => Promise<BackupStorageWriteResult>;
  download: (objectPath: string) => Promise<Buffer>;
};

export class InMemoryBackupStorage implements BackupStorageAdapter {
  readonly objects = new Map<string, Buffer>();

  async upload(input: {
    objectPath: string;
    body: Buffer;
    contentType: string;
    upsert?: boolean;
  }): Promise<BackupStorageWriteResult> {
    if (!input.upsert && this.objects.has(input.objectPath)) {
      throw new Error(`Backup artifact already exists: ${input.objectPath}`);
    }
    this.objects.set(input.objectPath, Buffer.from(input.body));
    return {
      path: input.objectPath,
      checksumSha256: sha256Hex(input.body),
      sizeBytes: input.body.byteLength,
    };
  }

  async download(objectPath: string): Promise<Buffer> {
    const value = this.objects.get(objectPath);
    if (!value) throw new Error(`Missing backup artifact: ${objectPath}`);
    return Buffer.from(value);
  }
}

export async function createSupabaseBackupStorageAdapter(): Promise<BackupStorageAdapter> {
  const validated = validateTenantBackupStorageConfig();
  if (!validated.ok) {
    throw new Error(validated.error);
  }

  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(validated.config.url, validated.config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const bucket = validated.config.bucket;

  return {
    async upload(input) {
      const { error } = await client.storage.from(bucket).upload(input.objectPath, input.body, {
        contentType: input.contentType,
        upsert: input.upsert ?? false,
      });
      if (error) throw new Error(`Backup upload failed: ${error.message}`);
      return {
        path: input.objectPath,
        checksumSha256: sha256Hex(input.body),
        sizeBytes: input.body.byteLength,
      };
    },
    async download(objectPath) {
      const { data, error } = await client.storage.from(bucket).download(objectPath);
      if (error || !data) {
        throw new Error(`Backup download failed: ${error?.message ?? "no data"}`);
      }
      const buf = Buffer.from(await data.arrayBuffer());
      return buf;
    },
  };
}