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
