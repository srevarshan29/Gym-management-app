const SECRET_KEYS = new Set([
  "passwordHash",
  "registrationToken",
  "refreshToken",
  "accessToken",
  "apiKey",
  "secret",
  "credentialsVersion",
]);

export function sanitizeRecordForExport(
  record: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (SECRET_KEYS.has(key)) {
      out[key] = "[REDACTED]";
      continue;
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const maybeTs = value as { toDate?: () => Date };
      if (typeof maybeTs.toDate === "function") {
        out[key] = maybeTs.toDate().toISOString();
        continue;
      }
    }
    out[key] = value;
  }
  return out;
}

export function sanitizeGymSnapshot(gym: Record<string, unknown>): Record<string, unknown> {
  return sanitizeRecordForExport(gym);
}