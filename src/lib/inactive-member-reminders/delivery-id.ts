/** Stable idempotency key for one inactivity period (anchored to last check-in). */
export function buildInactiveMemberDeliveryId(params: {
  gymId: string;
  memberId: string;
  inactiveAfterDays: number;
  lastAttendancePeriodMs: number;
}): string {
  return [
    params.gymId,
    params.memberId,
    "INACTIVE",
    String(params.inactiveAfterDays),
    String(params.lastAttendancePeriodMs),
  ].join("__");
}
