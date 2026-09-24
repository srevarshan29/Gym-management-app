/** Slug-safe catalog IDs: lowercase alphanumerics separated by single hyphens. */
export const CATALOG_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const CATALOG_ID_MIN_LENGTH = 2;
export const CATALOG_ID_MAX_LENGTH = 80;

export function isValidCatalogId(value: string): boolean {
  const trimmed = value.trim();
  return (
    trimmed.length >= CATALOG_ID_MIN_LENGTH &&
    trimmed.length <= CATALOG_ID_MAX_LENGTH &&
    CATALOG_ID_PATTERN.test(trimmed)
  );
}
