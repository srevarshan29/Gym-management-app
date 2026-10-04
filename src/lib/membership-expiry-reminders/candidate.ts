import type { DocWithId } from "@/lib/firestore/repositories/base";
import type { MemberDoc } from "@/lib/firestore/types";

import type { ExpiryReminderCandidate } from "./types";

export function memberDocToExpiryCandidate(
  member: DocWithId<MemberDoc>,
): ExpiryReminderCandidate {
  return {
    gymId: member.gymId,
    memberId: member.id,
    memberName: member.name,
    memberEmail: member.email,
    currentSubscriptionId: member.currentSubscriptionId,
    currentEndDate: member.currentEndDate?.toDate() ?? null,
  };
}
