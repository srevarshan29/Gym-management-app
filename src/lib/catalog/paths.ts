import { resolve } from "node:path";

/** Repository-relative catalog data directory (change-control source). */
export const CATALOG_DATA_DIR = resolve(process.cwd(), "data/catalog");

export const CATALOG_MANIFEST_PATH = resolve(CATALOG_DATA_DIR, "manifest.json");

export const CATALOG_EXERCISES_PATH = resolve(CATALOG_DATA_DIR, "exercises.json");

/** Local catalog image assets synced to Supabase `catalog/` paths. */
export const CATALOG_IMAGES_DIR = resolve(CATALOG_DATA_DIR, "images");

/** Firestore document path for platform sync metadata. */
export const CATALOG_SYNC_META_DOC_ID = "active";
