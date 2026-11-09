import { getRepositories } from "@/lib/firestore";

import { processMemberPortalInvitation } from "./process";

export type MemberPortalInvitationRecoveryStats = {
  candidates: number;
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
};

export async function runMemberPortalInvitationRecoveryJob(
  now: Date = new Date(),
  limit = 50,
): Promise<MemberPortalInvitationRecoveryStats> {
  const { notificationDeliveries } = getRepositories();
  const candidates =
    await notificationDeliveries.listRecoverableMemberPortalInvitations(
      now,
      limit,
    );

  const stats: MemberPortalInvitationRecoveryStats = {
    candidates: candidates.length,
    processed: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
  };

  for (const { gymId, memberId } of candidates) {
    stats.processed += 1;
    const result = await processMemberPortalInvitation({ gymId, memberId });
    if (result === "sent") stats.sent += 1;
    else if (
      result === "skipped_already_sent" ||
      result === "skipped_in_flight" ||
      result === "skipped_max_attempts"
    ) {
      stats.skipped += 1;
    } else if (
      result === "send_failed" ||
      result === "not_configured" ||
      result === "skipped_member_missing"
    ) {
      stats.failed += 1;
    }
  }

  return stats;
}
