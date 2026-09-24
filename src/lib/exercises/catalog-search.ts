/** Minimum token length indexed in `searchPrefixes`. */
export const CATALOG_SEARCH_PREFIX_MIN_LENGTH = 3;

/** Maximum results returned by catalog prefix search queries. */
export const MAX_CATALOG_SEARCH_RESULTS = 30;

/** Normalize a catalog exercise display name for storage and lookup. */
export function normalizeCatalogName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Normalize staff catalog search input: lowercase, trim, collapse whitespace,
 * strip punctuation (keeps letters, numbers, spaces, hyphens).
 */
export function normalizeCatalogSearchQuery(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Split a normalized catalog search query into tokens. */
export function tokenizeCatalogSearchQuery(query: string): string[] {
  const normalized = normalizeCatalogSearchQuery(query);
  if (!normalized) return [];
  return normalized.split(/\s+/).filter(Boolean);
}

/**
 * Build prefix tokens for Firestore `searchPrefixes` array indexing.
 * Stores every prefix of length >= 3 for each word in the exercise name.
 */
export function buildCatalogSearchPrefixes(name: string): string[] {
  const nameLower = normalizeCatalogName(name);
  const prefixes = new Set<string>();

  for (const word of nameLower.split(/\s+/)) {
    if (word.length < CATALOG_SEARCH_PREFIX_MIN_LENGTH) continue;
    for (let len = CATALOG_SEARCH_PREFIX_MIN_LENGTH; len <= word.length; len++) {
      prefixes.add(word.slice(0, len));
    }
  }

  return [...prefixes].sort();
}

/**
 * Upper bound for a Firestore `nameLower` prefix range query.
 * Example: "bench" -> "benci" (lexicographic successor of last char).
 */
export function catalogNamePrefixEnd(prefix: string): string {
  if (!prefix) return "\uf8ff";
  const lastCode = prefix.charCodeAt(prefix.length - 1);
  if (lastCode >= 0xffff) return `${prefix}\uf8ff`;
  return prefix.slice(0, -1) + String.fromCharCode(lastCode + 1);
}

/** Primary search token used for prefix / array-contains queries. */
export function primaryCatalogSearchToken(query: string): string | null {
  const tokens = tokenizeCatalogSearchQuery(query);
  if (tokens.length === 0) return null;
  return tokens[0] ?? null;
}
