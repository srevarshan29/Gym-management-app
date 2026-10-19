/**
 * Resolves the Firestore `startAfter` document id for a 1-based page index.
 * When `explicitStartAfterId` is set (from `ac` / `pc` query params), skips
 * sequential page walks for forward navigation.
 */
export async function resolveRangePageStartAfterId(
  page: number,
  explicitStartAfterId: string | null | undefined,
  fetchPage: (
    startAfterId: string | null,
  ) => Promise<{ nextCursor: string | null }>,
): Promise<string | null> {
  if (page <= 1) return null;
  if (explicitStartAfterId) return explicitStartAfterId;

  let cursor: string | null = null;
  for (let i = 1; i < page; i++) {
    const batch = await fetchPage(cursor);
    if (!batch.nextCursor) return null;
    cursor = batch.nextCursor;
  }
  return cursor;
}
