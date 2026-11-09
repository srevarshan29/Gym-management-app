/** Stable Resend idempotency key for one invitation send attempt. */
export function buildMemberPortalInvitationIdempotencyKey(
  deliveryId: string,
  attemptNumber: number,
): string {
  return `portal-invite:${deliveryId}:attempt:${attemptNumber}`;
}
