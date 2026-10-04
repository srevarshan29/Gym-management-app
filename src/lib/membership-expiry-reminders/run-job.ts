import { getRepositories, platformContext } from "@/lib/firestore";
import { getGymProfilePlatform } from "@/lib/gym-profile";
import { sendTransactionalEmail } from "@/lib/email/send-transactional-email";
import { getGymNotificationSettings } from "@/lib/notification-settings/get-settings";

import { memberDocToExpiryCandidate } from "./candidate";
import { processExpiryReminderCandidate } from "./process-candidate";
import type { ExpiryReminderDays } from "./types";
import { expiryCalendarDayRange } from "./window";

const REMINDER_DAYS: ExpiryReminderDays[] = [7, 3];

export type MembershipExpiryReminderJobStats = {
  gymsProcessed: number;
  candidatesScanned: number;
  sent: number;
  skippedIneligible: number;
  skippedDuplicate: number;
  sendFailed: number;
};

export async function runMembershipExpiryRemindersJob(
  now: Date = new Date(),
): Promise<MembershipExpiryReminderJobStats> {
  const { gyms, members, notificationDeliveries } = getRepositories();
  const stats: MembershipExpiryReminderJobStats = {
    gymsProcessed: 0,
    candidatesScanned: 0,
    sent: 0,
    skippedIneligible: 0,
    skippedDuplicate: 0,
    sendFailed: 0,
  };

  let startAfterId: string | null = null;
  for (;;) {
    const page = await gyms.listGymIdsPage({
      limit: 100,
      startAfterId,
    });
    if (page.gymIds.length === 0) break;

    for (const gymId of page.gymIds) {
      stats.gymsProcessed += 1;
      const [profile, notificationSettings] = await Promise.all([
        getGymProfilePlatform(gymId),
        getGymNotificationSettings(gymId),
      ]);
      const gymName = profile.name;

      for (const reminderDays of REMINDER_DAYS) {
        const channelSettings =
          reminderDays === 7
            ? notificationSettings.membershipExpiry7Day
            : notificationSettings.membershipExpiry3Day;
        if (!channelSettings.enabled) {
          continue;
        }

        const range = expiryCalendarDayRange(reminderDays, now);
        const memberDocs = await members.listWithCurrentEndDateInRange(
          platformContext,
          gymId,
          range,
        );

        for (const memberDoc of memberDocs) {
          if (memberDoc.gymId !== gymId) continue;
          stats.candidatesScanned += 1;
          const candidate = memberDocToExpiryCandidate(memberDoc);
          const result = await processExpiryReminderCandidate(
            candidate,
            reminderDays,
            gymName,
            now,
            channelSettings,
            {
              claimDelivery: (record) =>
                notificationDeliveries.claimMembershipExpiryReminder(record),
              releaseDelivery: (record) =>
                notificationDeliveries.releaseMembershipExpiryReminder(record),
              sendEmail: sendTransactionalEmail,
            },
          );

          if (result === "sent") stats.sent += 1;
          else if (result === "skipped_ineligible") stats.skippedIneligible += 1;
          else if (result === "skipped_duplicate") stats.skippedDuplicate += 1;
          else if (result === "send_failed") stats.sendFailed += 1;
        }
      }
    }

    if (!page.nextStartAfterId) break;
    startAfterId = page.nextStartAfterId;
  }

  return stats;
}
