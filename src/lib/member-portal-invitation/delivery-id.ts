/** One automatic invitation record per member (idempotent on registration). */
export function buildMemberPortalAutoInviteDeliveryId(params: {
  gymId: string;
  memberId: string;
}): string {
  return [params.gymId, params.memberId, "PORTAL_INVITE", "AUTO"].join("__");
}
