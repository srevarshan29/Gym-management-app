import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  validateImageUploadFile,
} from "@/lib/storage/image-validation";
import {
  validatePublicStorageObjectPath,
  validatePublicStoragePath,
} from "@/lib/storage/path-validation";
import {
  validateSupabaseStorageConfig,
  type SupabaseStorageRuntimeConfig,
} from "@/lib/storage/supabase-config";

export type UploadResult =
  | { url: string; objectPath: string }
  | { error: string };

export type DeleteStorageResult = { ok: true } | { ok: false; error: string };

let cachedClient:
  | { config: SupabaseStorageRuntimeConfig; client: SupabaseClient }
  | null
  | undefined;

/** Clears cached Supabase admin client (tests only). */
export function resetSupabaseAdminCache(): void {
  cachedClient = undefined;
}

function getSupabaseAdmin():
  | { config: SupabaseStorageRuntimeConfig; client: SupabaseClient }
  | { error: string } {
  const validated = validateSupabaseStorageConfig();
  if (!validated.ok) {
    return { error: validated.error };
  }

  if (
    cachedClient &&
    cachedClient.config.url === validated.config.url &&
    cachedClient.config.serviceRoleKey === validated.config.serviceRoleKey &&
    cachedClient.config.bucket === validated.config.bucket
  ) {
    return cachedClient;
  }

  cachedClient = {
    config: validated.config,
    client: createClient(validated.config.url, validated.config.serviceRoleKey, {
      auth: { persistSession: false },
    }),
  };
  return cachedClient;
}

/**
 * Upload a public image object to Supabase Storage.
 * `pathWithoutExt` must be a safe, caller-validated storage key without extension.
 */
export async function uploadPublicStorageImage(
  file: File,
  pathWithoutExt: string,
): Promise<UploadResult> {
  const admin = getSupabaseAdmin();
  if ("error" in admin) {
    return { error: admin.error };
  }

  const validated = validateImageUploadFile(file);
  if (!validated.ok) {
    return { error: validated.error };
  }

  const pathValidation = validatePublicStoragePath(pathWithoutExt);
  if (!pathValidation.ok) {
    return { error: pathValidation.error };
  }

  const objectPath = `${pathWithoutExt}.${validated.extension}`;
  const objectPathValidation = validatePublicStorageObjectPath(objectPath);
  if (!objectPathValidation.ok) {
    return { error: objectPathValidation.error };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { config, client } = admin;

  const { error: uploadError } = await client.storage
    .from(config.bucket)
    .upload(objectPath, buffer, {
      contentType: validated.mime,
      upsert: true,
    });

  if (uploadError) {
    return { error: `Could not upload image: ${uploadError.message}` };
  }

  const { data } = client.storage.from(config.bucket).getPublicUrl(objectPath);
  return { url: data.publicUrl, objectPath };
}

/**
 * Deletes a previously uploaded public storage object.
 * Only approved object paths may be deleted.
 */
export async function deletePublicStorageObject(
  objectPath: string,
): Promise<DeleteStorageResult> {
  const admin = getSupabaseAdmin();
  if ("error" in admin) {
    return { ok: false, error: admin.error };
  }

  const pathValidation = validatePublicStorageObjectPath(objectPath);
  if (!pathValidation.ok) {
    return { ok: false, error: pathValidation.error };
  }

  const { config, client } = admin;
  const { error } = await client.storage.from(config.bucket).remove([objectPath]);
  if (error) {
    return {
      ok: false,
      error: `Could not delete uploaded image: ${error.message}`,
    };
  }

  return { ok: true };
}

/** Uploads a gym logo image to Supabase Storage and returns its public URL. */
export async function uploadGymLogo(file: File): Promise<UploadResult> {
  return uploadPublicStorageImage(file, `logo-${Date.now()}`);
}

/** Uploads a member profile photo and returns its public URL. */
export async function uploadMemberPhoto(
  file: File,
  memberId: string,
): Promise<UploadResult> {
  return uploadPublicStorageImage(file, `members/${memberId}-${Date.now()}`);
}
