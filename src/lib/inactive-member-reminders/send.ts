import { getRepositories, platformContext } from "@/lib/firestore";
import { sendTransactionalEmail } from "@/lib/email/send-transactional-email";
import { getGymProfilePlatform } from "@/lib/gym-profile";
import { getGymNotificationSettings } from "@/lib/notification-settings/get-settings";
import { areAutomaticEmailNotificationsEnabled } from "@/lib/notification-settings/automatic-email";

import { processInactiveMemberCandidate } from "./process-candidate";
import { listInactiveMemberTargets } from "./targets";
import type { InactiveMemberJobStats, InactiveMemberSendSummary } from "./types";

const BULK_SEND_BATCH_SIZE = 25;

function emptySummary(): InactiveMemberSendSummary {
  return {
    sent: 0,
    skippedIneligible: 0,
    skippedDuplicate: 0,
    skippedNoEmail: 0,
    failed: 0,
  };
}

function bumpSummary(
  summary: InactiveMemberSendSummary,
  result: Awaited<ReturnType<typeof processInactiveMemberCandidate>>,
): void {
  if (result === "sent") summary.sent += 1;
  else if (result === "skipped_ineligible") summary.skippedIneligible += 1;
  else if (result === "skipped_duplicate") summary.skippedDuplicate += 1;
  else if (result === "send_failed") summary.failed += 1;
}

export async function sendInactiveMemberRemindersBulk(
  gymId: string,
  now: Date = new Date(),
): Promise<InactiveMemberSendSummary> {
  const settings = await getGymNotificationSettings(gymId);
  if (!settings.inactiveMemberEmail.enabled) {
    return emptySummary();
  }

  const profile = await getGymProfilePlatform(gymId);
  const targets = await listInactiveMemberTargets(gymId, now);
  const { notificationDeliveries } = getRepositories();
  const summary = emptySummary();

  const deps = {
    claimDelivery: (record: Parameters<
      typeof notificationDeliveries.claimInactiveMemberReminder
    >[0]) => notificationDeliveries.claimInactiveMemberReminder(record),
    releaseDelivery: (record: Parameters<
      typeof notificationDeliveries.releaseInactiveMemberReminder
    >[0]) => notificationDeliveries.releaseInactiveMemberReminder(record),
    sendEmail: sendTransactionalEmail,
  };

  for (let i = 0; i < targets.length; i += BULK_SEND_BATCH_SIZE) {
    const batch = targets.slice(i, i + BULK_SEND_BATCH_SIZE);
    for (const member of batch) {
      if (member.gymId !== gymId) continue;
      const result = await processInactiveMemberCandidate(
        { ...member, id: member.id },
        settings,
        profile.name,
        now,
        deps,
        { skipChannelEnabledCheck: true },
      );
      bumpSummary(summary, result);
    }
  }

  return summary;
}

export async function runInactiveMemberRemindersJob(
  now: Date = new Date(),
): Promise<InactiveMemberJobStats> {
  const { gyms, members, notificationDeliveries } = getRepositories();
  const stats: InactiveMemberJobStats = {
    gymsProcessed: 0,
    candidatesScanned: 0,
    sent: 0,
    skippedIneligible: 0,
    skippedDuplicate: 0,
    skippedNoEmail: 0,
    failed: 0,
  };

  const deps = {
    claimDelivery: (record: Parameters<
      typeof notificationDeliveries.claimInactiveMemberReminder
    >[0]) => notificationDeliveries.claimInactiveMemberReminder(record),
    releaseDelivery: (record: Parameters<
      typeof notificationDeliveries.releaseInactiveMemberReminder
    >[0]) => notificationDeliveries.releaseInactiveMemberReminder(record),
    sendEmail: sendTransactionalEmail,
  };

  let startAfterId: string | null = null;
  for (;;) {
    const page = await gyms.listGymIdsPage({ limit: 100, startAfterId });
    if (page.gymIds.length === 0) break;

    for (const gymId of page.gymIds) {
      stats.gymsProcessed += 1;
      const [profile, notificationSettings] = await Promise.all([
        getGymProfilePlatform(gymId),
        getGymNotificationSettings(gymId),
      ]);

      if (!areAutomaticEmailNotificationsEnabled(notificationSettings)) {
        continue;
      }
      if (!notificationSettings.inactiveMemberEmail.enabled) {
        continue;
      }

      let cursor: string | null = null;
      for (;;) {
        const batch = await members.listExportBatch(platformContext, gymId, {
          limit: 200,
          startAfterId: cursor,
        });
        for (const member of batch.rows) {
          if (member.gymId !== gymId) continue;
          stats.candidatesScanned += 1;
          const result = await processInactiveMemberCandidate(
            { ...member, id: member.id },
            notificationSettings,
            profile.name,
            now,
            deps,
          );
          bumpSummary(stats, result);
        }
        if (!batch.nextCursor) break;
        cursor = batch.nextCursor;
      }
    }

    if (!page.nextStartAfterId) break;
    startAfterId = page.nextStartAfterId;
  }

  return stats;
}
