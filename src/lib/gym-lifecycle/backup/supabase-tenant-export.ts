import { gymSupabaseStoragePrefix } from "@/lib/gym-lifecycle/purge/inventory";

export type SupabaseStorageObjectManifestEntry = {
  path: string;
  sizeBytes: number;
  contentType: string | null;
  checksumSha256: string;
};

export type SupabaseStorageLister = {
  list: (input: {
    prefix: string;
    offset: number;
    limit: number;
  }) => Promise<{ objects: Array<{ name: string; id: string | null }>; hasMore: boolean }>;
  download: (path: string) => Promise<Buffer>;
};

const LIST_PAGE = 1000;

/** Breadth-first walk of `gyms/{gymId}/` including nested folders. */
export async function listAllTenantStorageObjects(
  lister: SupabaseStorageLister,
  gymId: string,
): Promise<string[]> {
  const base = gymSupabaseStoragePrefix(gymId);
  const queue: string[] = [base];
  const files: string[] = [];

  while (queue.length > 0) {
    const prefix = queue.shift()!;
  let offset = 0;
    for (;;) {
      const page = await lister.list({ prefix, offset, limit: LIST_PAGE });
      for (const item of page.objects) {
        const name = item.name;
        if (!name) continue;
        const fullPath = prefix.endsWith("/") ? `${prefix}${name}` : `${prefix}/${name}`;
        const isFolder = item.id == null;
        if (isFolder) {
          queue.push(fullPath.endsWith("/") ? fullPath : `${fullPath}/`);
          continue;
        }
        if (!fullPath.startsWith(base)) {
          throw new Error(`Storage path escapes tenant prefix: ${fullPath}`);
        }
        files.push(fullPath);
      }
      if (!page.hasMore) break;
      offset += LIST_PAGE;
    }
  }

  return [...new Set(files)].sort();
}

export async function exportSupabaseObject(
  lister: SupabaseStorageLister,
  path: string,
): Promise<SupabaseStorageObjectManifestEntry> {
  const bytes = await lister.download(path);
  const { sha256Hex } = await import("@/lib/gym-lifecycle/backup/checksum");
  return {
    path,
    sizeBytes: bytes.byteLength,
    contentType: "application/octet-stream",
    checksumSha256: sha256Hex(bytes),
  };
}