import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const MAX_LOGO_BYTES = 5 * 1024 * 1024;

let cachedClient: SupabaseClient | null | undefined;

/** Returns null if Supabase Storage env vars are not configured. */
function getSupabaseAdmin(): SupabaseClient | null {
  if (cachedClient !== undefined) return cachedClient;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    cachedClient = null;
    return cachedClient;
  }

  cachedClient = createClient(url, key, { auth: { persistSession: false } });
  return cachedClient;
}

export type UploadResult = { url: string } | { error: string };

/** Uploads a gym logo image to Supabase Storage and returns its public URL. */
export async function uploadGymLogo(file: File): Promise<UploadResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return {
      error:
        "Logo upload is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable it.",
    };
  }
  if (!file.type.startsWith("image/")) {
    return { error: "Logo must be an image file." };
  }
  if (file.size > MAX_LOGO_BYTES) {
    return { error: "Logo must be smaller than 5MB." };
  }

  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "gym-assets";
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `logo-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (uploadError) {
    return { error: `Could not upload logo: ${uploadError.message}` };
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl };
}
