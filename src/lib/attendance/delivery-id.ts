/** Legacy deterministic id (one doc per day). Do not use for new check-ins. */
export function buildLegacyAttendanceDayDocId(
  gymId: string,
  memberId: string,
  dateKey: string,
): string {
  return `${gymId}__${memberId}__${dateKey}`;
}

/** @deprecated Use Firestore auto-ids for new attendance records. */
export const buildAttendanceDayDocId = buildLegacyAttendanceDayDocId;
