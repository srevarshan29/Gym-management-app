import type { InactiveMemberAfterDays } from "@/lib/notification-settings/types";

export type InactiveMemberCandidate = {
  gymId: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  lastAttendanceAt: Date;
  daysInactive: number;
};

export type InactiveMemberDeliveryRecord = {
  gymId: string;
  memberId: string;
  inactiveAfterDays: InactiveMemberAfterDays;
  lastAttendancePeriodMs: number;
  recipientEmail: string;
};

export type InactiveMemberEligibility =
  | "eligible"
  | "skipped_wrong_gym"
  | "skipped_not_active"
  | "skipped_no_email"
  | "skipped_no_attendance"
  | "skipped_not_inactive_enough";

export type InactiveMemberProcessResult =
  | "sent"
  | "skipped_ineligible"
  | "skipped_disabled"
  | "skipped_duplicate"
  | "send_failed";

export type InactiveMemberSendSummary = {
  sent: number;
  skippedIneligible: number;
  skippedDuplicate: number;
  skippedNoEmail: number;
  failed: number;
};

export type InactiveMemberJobStats = InactiveMemberSendSummary & {
  gymsProcessed: number;
  candidatesScanned: number;
};
