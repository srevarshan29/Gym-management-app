const SAFE_BUCKET_PATTERN = /^[a-zA-Z0-9_-]{1,80}$/;

export type SupabaseStorageRuntimeConfig = {
  url: string;
  host: string;
  serviceRoleKey: string;
  bucket: string;
};

export type SupabaseStorageConfigValidationResult =
  | { ok: true; config: SupabaseStorageRuntimeConfig }
  | { ok: false; error: string };

/** Environment keys read by validateSupabaseStorageConfig. */
export type SupabaseStorageEnvInput = Partial<
  Record<
    "SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY" | "SUPABASE_STORAGE_BUCKET",
    string | undefined
  >
>;

function invalidConfig(error: string): SupabaseStorageConfigValidationResult {
  return { ok: false, error };
}

export function validateSupabaseStorageConfig(
  env: SupabaseStorageEnvInput = process.env as SupabaseStorageEnvInput,
): SupabaseStorageConfigValidationResult {
  const url = env.SUPABASE_URL?.trim();
  if (!url) {
    return invalidConfig(
      "Image upload is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable it.",
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return invalidConfig(
      "Image upload configuration is invalid. Check SUPABASE_URL format.",
    );
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return invalidConfig(
      "Image upload configuration is invalid. SUPABASE_URL must use http or https.",
    );
  }

  if (!parsedUrl.host) {
    return invalidConfig(
      "Image upload configuration is invalid. SUPABASE_URL must include a host.",
    );
  }

  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceRoleKey) {
    return invalidConfig(
      "Image upload is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable it.",
    );
  }

  const bucket = env.SUPABASE_STORAGE_BUCKET?.trim() || "gym-assets";
  if (!SAFE_BUCKET_PATTERN.test(bucket)) {
    return invalidConfig(
      "Image upload configuration is invalid. Check SUPABASE_STORAGE_BUCKET format.",
    );
  }

  return {
    ok: true,
    config: {
      url,
      host: parsedUrl.host,
      serviceRoleKey,
      bucket,
    },
  };
}
