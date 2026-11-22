const SAFE_BUCKET_PATTERN = /^[a-zA-Z0-9_-]{1,80}$/;

export type TenantBackupStorageConfig = {
  url: string;
  serviceRoleKey: string;
  bucket: string;
};

export type TenantBackupConfigValidationResult =
  | { ok: true; config: TenantBackupStorageConfig }
  | { ok: false; error: string };

/**
 * Private tenant backup bucket — separate from public gym-assets (SUPABASE_STORAGE_BUCKET).
 * Requires GYM_TENANT_BACKUP_BUCKET plus the standard Supabase URL/service role.
 */
export function validateTenantBackupStorageConfig(
  env: NodeJS.ProcessEnv = process.env,
): TenantBackupConfigValidationResult {
  const url = env.SUPABASE_URL?.trim();
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const bucket = env.GYM_TENANT_BACKUP_BUCKET?.trim();

  if (!url || !serviceRoleKey) {
    return {
      ok: false,
      error:
        "Tenant backup is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    };
  }

  if (!bucket) {
    return {
      ok: false,
      error:
        "Tenant backup bucket is not configured. Set GYM_TENANT_BACKUP_BUCKET to a private bucket.",
    };
  }

  if (!SAFE_BUCKET_PATTERN.test(bucket)) {
    return { ok: false, error: "GYM_TENANT_BACKUP_BUCKET has an invalid format." };
  }

  return { ok: true, config: { url, serviceRoleKey, bucket } };
}

export function isTenantBackupStorageConfigured(): boolean {
  return validateTenantBackupStorageConfig().ok;
}