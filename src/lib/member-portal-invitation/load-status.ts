import { getRepositories } from "@/lib/firestore";
import { scheduleMemberPortalInvitationProcessing } from "@/lib/schedule-background-work";
import type { MemberPortalInvitationSummary } from "@/lib/member-portal-invitation/types";

export type { MemberPortalInvitationSummary } from "@/lib/member-portal-invitation/types";
export { formatInvitationStatusLabel } from "@/lib/member-portal-invitation/types";

export async function loadMemberPortalInvitationSummary(
  gymId: string,
  memberId: string,
): Promise<MemberPortalInvitationSummary | null> {
  const { notificationDeliveries } = getRepositories();
  const summary = await notificationDeliveries.getMemberPortalAutoInvitation(
    gymId,
    memberId,
  );

  if (summary?.status === "PENDING") {
    const recover =
      await notificationDeliveries.shouldRecoverMemberPortalInvitation(
        gymId,
        memberId,
      );
    if (recover) {
      scheduleMemberPortalInvitationProcessing(gymId, memberId);
    }
  }

  return summary;
}
