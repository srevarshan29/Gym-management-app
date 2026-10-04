import { getRepositories, platformContext } from "@/lib/firestore";
import { sendTransactionalEmail } from "@/lib/email/send-transactional-email";
import { getGymProfilePlatform } from "@/lib/gym-profile";
import { getGymNotificationSettings } from "@/lib/notification-settings/get-settings";
import { buildMembershipExpiryEmailFromSettings } from "@/lib/notification-settings/membership-expiry-email";

import {
  assessManualRenewalReminderEligibility,
  daysRemainingForManualReminder,
} from "./eligibility";
import { listManualRenewalReminderTargets } from "./targets";
import type {
  ManualRenewalMemberSendResult,
  ManualRenewalReminderVariant,
  ManualRenewalSendSummary,
} from "./types";

const BULK_SEND_BATCH_SIZE = 25;

function emptySummary(): ManualRenewalSendSummary {
  return { sent: 0, skippedNoEmail: 0, failed: 0 };
}

function bumpSummary(
  summary: ManualRenewalSendSummary,
  result: ManualRenewalMemberSendResult,
): void {
  if (result.status === "sent") summary.sent += 1;
  else if (result.status === "skipped_no_email") summary.skippedNoEmail += 1;
  else if (result.status === "failed") summary.failed += 1;
}

export async function sendManualRenewalReminderToMember(
  gymId: string,
  memberId: string,
  variant: ManualRenewalReminderVariant,
  expectedEndDate: Date | null,
  now: Date = new Date(),
): Promise<ManualRenewalMemberSendResult> {
  const settings = await getGymNotificationSettings(gymId);
  if (!settings.manualRenewalReminder.enabled) {
    return {
      status: "failed",
      error: "Manual renewal reminders are disabled in notification settings.",
    };
  }

  const { members } = getRepositories();
  const member = await members.findByIdAndGym(platformContext, memberId, gymId);
  if (!member) {
    return { status: "skipped_ineligible" };
  }

  const eligibility = assessManualRenewalReminderEligibility(
    member,
    variant,
    expectedEndDate,
    now,
  );
  if (eligibility === "skipped_no_email") {
    return { status: "skipped_no_email" };
  }
  if (eligibility !== "eligible") {
    return { status: "skipped_ineligible" };
  }

  const endDate = member.currentEndDate!.toDate();
  const profile = await getGymProfilePlatform(gymId);
  const recipientEmail = member.email!.trim();
  const { subject, html, text } = buildMembershipExpiryEmailFromSettings(
    settings.manualRenewalReminder,
    {
      memberName: member.name,
      gymName: profile.name,
      expiryDate: endDate,
      daysRemaining: daysRemainingForManualReminder(endDate, now),
    },
  );

  try {
    await sendTransactionalEmail({ to: recipientEmail, subject, html, text });
    return { status: "sent" };
  } catch (err) {
    return {
      status: "failed",
      error: err instanceof Error ? err.message : "Send failed",
    };
  }
}

export async function sendManualRenewalRemindersBulk(
  gymId: string,
  variant: ManualRenewalReminderVariant,
  q?: string,
  now: Date = new Date(),
): Promise<ManualRenewalSendSummary> {
  const settings = await getGymNotificationSettings(gymId);
  if (!settings.manualRenewalReminder.enabled) {
    return emptySummary();
  }

  const targets = await listManualRenewalReminderTargets(gymId, variant, q);
  const summary = emptySummary();

  for (let i = 0; i < targets.length; i += BULK_SEND_BATCH_SIZE) {
    const batch = targets.slice(i, i + BULK_SEND_BATCH_SIZE);
    for (const target of batch) {
      const result = await sendManualRenewalReminderToMember(
        gymId,
        target.memberId,
        variant,
        target.endDate,
        now,
      );
      if (result.status === "skipped_ineligible") {
        continue;
      }
      bumpSummary(summary, result);
    }
  }

  return summary;
}

export async function countBulkManualRenewalEmailRecipients(
  gymId: string,
  variant: ManualRenewalReminderVariant,
  q?: string,
): Promise<number> {
  const targets = await listManualRenewalReminderTargets(gymId, variant, q);
  return targets.filter((t) => t.email?.trim()).length;
}
