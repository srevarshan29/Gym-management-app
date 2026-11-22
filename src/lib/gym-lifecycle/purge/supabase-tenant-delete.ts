import { validateSupabaseStorageConfig } from "@/lib/storage/supabase-config";

export async function deleteSupabaseStoragePrefix(prefix: string): Promise<void> {
  const config = validateSupabaseStorageConfig();
  if (!config.ok) {
    throw new Error(config.error);
  }

  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(config.config.url, config.config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const bucket = config.config.bucket;
  const { data: listed, error: listError } = await client.storage.from(bucket).list(prefix, {
    limit: 1000,
  });
  if (listError) {
    throw new Error(`Failed to list storage prefix ${prefix}: ${listError.message}`);
  }
  if (!listed?.length) return;

  const paths = listed.map((item) => `${prefix}${item.name}`);
  const { error: removeError } = await client.storage.from(bucket).remove(paths);
  if (removeError) {
    throw new Error(`Failed to delete storage prefix ${prefix}: ${removeError.message}`);
  }
}