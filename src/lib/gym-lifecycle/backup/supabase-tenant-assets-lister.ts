import { gymSupabaseStoragePrefix } from "@/lib/gym-lifecycle/purge/inventory";
import type { SupabaseStorageLister } from "@/lib/gym-lifecycle/backup/supabase-tenant-export";
import { validateSupabaseStorageConfig } from "@/lib/storage/supabase-config";

function listFolderPath(prefix: string): string {
  const trimmed = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;
  return trimmed;
}

/**
 * Read-only lister for tenant media in the public gym-assets bucket (`SUPABASE_STORAGE_BUCKET`).
 * Distinct from `GYM_TENANT_BACKUP_BUCKET` used for private backup artifacts.
 */
export async function createSupabaseTenantAssetsLister(
  gymId: string,
): Promise<SupabaseStorageLister> {
  const validated = validateSupabaseStorageConfig();
  if (!validated.ok) {
    throw new Error(
      `Tenant Supabase asset export is unavailable: ${validated.error}`,
    );
  }

  const tenantPrefix = gymSupabaseStoragePrefix(gymId);
  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(validated.config.url, validated.config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const bucket = validated.config.bucket;

  const assertTenantPath = (path: string, kind: "list" | "download") => {
    if (!path.startsWith(tenantPrefix)) {
      throw new Error(
        `Supabase ${kind} refused path outside tenant prefix ${tenantPrefix}: ${path}`,
      );
    }
  };

  return {
    async list(input) {
      assertTenantPath(input.prefix, "list");
      const folder = listFolderPath(input.prefix);
      const { data, error } = await client.storage.from(bucket).list(folder, {
        limit: input.limit,
        offset: input.offset,
        sortBy: { column: "name", order: "asc" },
      });
      if (error) {
        throw new Error(
          `Failed to list Supabase storage at ${folder}: ${error.message}`,
        );
      }
      const objects = (data ?? []).map((item) => ({
        name: item.name,
        id: item.id ?? null,
      }));
      const hasMore = objects.length >= input.limit;
      return { objects, hasMore };
    },
    async download(path: string) {
      assertTenantPath(path, "download");
      const { data, error } = await client.storage.from(bucket).download(path);
      if (error || !data) {
        throw new Error(
          `Failed to download Supabase object ${path}: ${error?.message ?? "no data"}`,
        );
      }
      return Buffer.from(await data.arrayBuffer());
    },
  };
}