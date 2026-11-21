/** Missing or invalid stored values are treated as legacy version 0. */
export function resolveCredentialsVersion(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    return 0;
  }
  return value;
}

export function nextCredentialsVersion(current: unknown): number {
  return resolveCredentialsVersion(current) + 1;
}