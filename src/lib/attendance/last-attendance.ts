/** Never move lastAttendanceAt backwards when merging timestamps. */
export function maxLastAttendanceAt(
  existing: Date | null | undefined,
  candidate: Date,
): Date {
  if (!existing) return candidate;
  return candidate.getTime() > existing.getTime() ? candidate : existing;
}

export function shouldUpdateLastAttendanceAt(
  existing: Date | null | undefined,
  candidate: Date,
): boolean {
  if (!existing) return true;
  return candidate.getTime() > existing.getTime();
}
