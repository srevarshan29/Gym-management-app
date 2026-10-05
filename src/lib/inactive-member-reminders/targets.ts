import { getRepositories, platformContext } from "@/lib/firestore";
import type { DocWithId } from "@/lib/firestore/repositories/base";
import type { MemberDoc } from "@/lib/firestore/types";
import { getGymNotificationSettings } from "@/lib/notification-settings/get-settings";

import { assessInactiveMemberEligibility } from "./eligibility";

const MEMBER_SCAN_BATCH = 200;

export async function listInactiveMemberTargets(
  gymId: string,
  now: Date = new Date(),
): Promise<DocWithId<MemberDoc>[]> {
  const settings = await getGymNotificationSettings(gymId);
  const { members } = getRepositories();
  const targets: DocWithId<MemberDoc>[] = [];

  let cursor: string | null = null;
  for (;;) {
    const batch = await members.listExportBatch(platformContext, gymId, {
      limit: MEMBER_SCAN_BATCH,
      startAfterId: cursor,
    });
    for (const member of batch.rows) {
      if (member.gymId !== gymId) continue;
      const eligibility = assessInactiveMemberEligibility(
        member,
        gymId,
        settings.inactiveAfterDays,
        now,
      );
      if (eligibility === "eligible") {
        targets.push(member);
      }
    }
    if (!batch.nextCursor) break;
    cursor = batch.nextCursor;
  }

  return targets;
}

export async function countInactiveMemberEmailRecipients(
  gymId: string,
  now: Date = new Date(),
): Promise<number> {
  const targets = await listInactiveMemberTargets(gymId, now);
  return targets.length;
}
