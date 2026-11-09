import type { FirestoreContext } from "@/lib/firestore/context";
import { getRepositories } from "@/lib/firestore";
import { scheduleMemberPortalInvitationProcessing } from "@/lib/schedule-background-work";

/**
 * Enables portal access and queues a durable invitation after staff registers a member.
 * Never throws — registration must succeed even when this fails.
 */
export async function afterMemberRegistered(params: {
  gymId: string;
  memberId: string;
  staffCtx: FirestoreContext;
}): Promise<void> {
  const { members, notificationDeliveries } = getRepositories();
  const member = await members.findByIdAndGym(
    params.staffCtx,
    params.memberId,
    params.gymId,
  );
  if (!member) return;

  const email = member.email?.trim();
  if (!email) return;

  await members.enablePortal(params.staffCtx, params.gymId, params.memberId);

  const queued = await notificationDeliveries.queueAutoMemberPortalInvitation({
    gymId: params.gymId,
    memberId: params.memberId,
    recipientEmail: email,
  });

  if (queued) {
    scheduleMemberPortalInvitationProcessing(params.gymId, params.memberId);
    return;
  }

  const summary = await notificationDeliveries.getMemberPortalAutoInvitation(
    params.gymId,
    params.memberId,
  );
  if (summary?.status === "PENDING") {
    scheduleMemberPortalInvitationProcessing(params.gymId, params.memberId);
  }
}
