/** Build searchable token array for member directory queries. */
export function buildMemberSearchTokens(
  name: string,
  phone: string,
  memberNumber: number,
): string[] {
  const tokens = new Set<string>();
  const nameLower = name.trim().toLowerCase();
  const phoneDigits = phone.replace(/\D/g, "");
  const padded = String(memberNumber).padStart(4, "0");

  if (nameLower) {
    tokens.add(nameLower);
    for (const word of nameLower.split(/\s+/)) {
      if (word) tokens.add(word);
    }
  }
  if (phone.trim()) tokens.add(phone.trim().toLowerCase());
  if (phoneDigits) {
    tokens.add(phoneDigits);
    if (phoneDigits.length >= 4) {
      tokens.add(phoneDigits.slice(-4));
    }
  }
  tokens.add(String(memberNumber));
  tokens.add(padded);
  tokens.add(`#${memberNumber}`);
  tokens.add(`#${padded}`);

  return [...tokens];
}

export function normalizeSearchQuery(query: string): string {
  let q = query.trim().toLowerCase();
  if (q.startsWith("#")) q = q.slice(1).trim();
  return q;
}

export function tokenizeSearchQuery(query: string): string[] {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) return [];
  return normalized.split(/\s+/).filter(Boolean);
}

export function memberDocMatchesQueryTokens(
  memberSearchTokens: string[],
  queryTokens: string[],
): boolean {
  if (queryTokens.length === 0) return true;
  return queryTokens.every((t) =>
    memberSearchTokens.some((token) => token.includes(t)),
  );
}

/** Firestore batch size when scanning token matches (avoids unbounded `.get()`). */
export const MEMBER_DIRECTORY_SEARCH_SCAN_BATCH = 200;

export function memberSearchPageBounds(
  page: number,
  pageSize: number,
): { offset: number; limit: number } {
  const safePage = Math.max(1, Math.floor(page));
  return { offset: (safePage - 1) * pageSize, limit: pageSize };
}

/** Slice an in-memory match list for directory pagination (used in tests). */
export function sliceMemberSearchMatches<T>(
  matches: T[],
  page: number,
  pageSize: number,
): { rows: T[]; matchingCount: number } {
  const matchingCount = matches.length;
  const { offset, limit } = memberSearchPageBounds(page, pageSize);
  return { rows: matches.slice(offset, offset + limit), matchingCount };
}
