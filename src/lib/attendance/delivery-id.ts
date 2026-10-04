/** Deterministic id for one normal check-in per gym + member + calendar day. */
export function buildAttendanceDayDocId(
  gymId: string,
  memberId: string,
  dateKey: string,
): string {
  return `${gymId}__${memberId}__${dateKey}`;
}
