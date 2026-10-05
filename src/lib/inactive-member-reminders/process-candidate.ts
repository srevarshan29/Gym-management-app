import { buildInactiveMemberEmailFromSettings } from "@/lib/notification-settings/inactive-member-email";
import type { GymNotificationSettingsData } from "@/lib/notification-settings/types";

import {
  assessInactiveMemberEligibility,
  daysSinceLastAttendance,
} from "./eligibility";
import type {
  InactiveMemberCandidate,
  InactiveMemberDeliveryRecord,
  InactiveMemberProcessResult,
} from "./types";

export type InactiveMemberProcessorDeps = {
  claimDelivery: (record: InactiveMemberDeliveryRecord) => Promise<boolean>;
  releaseDelivery: (
    record: Pick<
      InactiveMemberDeliveryRecord,
      "gymId" | "memberId" | "inactiveAfterDays" | "lastAttendancePeriodMs"
    >,
  ) => Promise<void>;
  sendEmail: (params: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }) => Promise<void>;
};

export function memberDocToInactiveCandidate(
  member: {
    id: string;
    gymId: string;
    name: string;
    email: string | null;
    lastAttendanceAt?: { toDate: () => Date } | null;
  },
  now: Date,
): InactiveMemberCandidate | null {
  const lastAt = member.lastAttendanceAt?.toDate() ?? null;
  const email = member.email?.trim();
  if (!lastAt || !email) return null;

  return {
    gymId: member.gymId,
    memberId: member.id,
    memberName: member.name,
    memberEmail: email,
    lastAttendanceAt: lastAt,
    daysInactive: daysSinceLastAttendance(lastAt, now),
  };
}

export async function processInactiveMemberCandidate(
  member: Parameters<typeof assessInactiveMemberEligibility>[0] & {
    id: string;
    name: string;
  },
  settings: Pick<
    GymNotificationSettingsData,
    "inactiveMemberEmail" | "inactiveAfterDays"
  >,
  gymName: string,
  now: Date,
  deps: InactiveMemberProcessorDeps,
  options?: { skipChannelEnabledCheck?: boolean },
): Promise<InactiveMemberProcessResult> {
  if (!options?.skipChannelEnabledCheck && !settings.inactiveMemberEmail.enabled) {
    return "skipped_disabled";
  }

  const eligibility = assessInactiveMemberEligibility(
    member,
    member.gymId,
    settings.inactiveAfterDays,
    now,
  );
  if (eligibility !== "eligible") {
    return "skipped_ineligible";
  }

  const lastAt = member.lastAttendanceAt!.toDate();
  const recipientEmail = member.email!.trim();
  const daysInactive = daysSinceLastAttendance(lastAt, now);

  const deliveryRecord: InactiveMemberDeliveryRecord = {
    gymId: member.gymId,
    memberId: member.id,
    inactiveAfterDays: settings.inactiveAfterDays,
    lastAttendancePeriodMs: lastAt.getTime(),
    recipientEmail,
  };

  const claimed = await deps.claimDelivery(deliveryRecord);
  if (!claimed) {
    return "skipped_duplicate";
  }

  const { subject, html, text } = buildInactiveMemberEmailFromSettings(
    settings.inactiveMemberEmail,
    {
      memberName: member.name,
      gymName,
      daysInactive,
    },
  );

  try {
    await deps.sendEmail({ to: recipientEmail, subject, html, text });
    return "sent";
  } catch (err) {
    console.error("[inactive-member-reminders] send failed:", {
      gymId: member.gymId,
      memberId: member.id,
      err,
    });
    await deps.releaseDelivery(deliveryRecord).catch((releaseErr) => {
      console.error(
        "[inactive-member-reminders] failed to release delivery claim:",
        releaseErr,
      );
    });
    return "send_failed";
  }
}
