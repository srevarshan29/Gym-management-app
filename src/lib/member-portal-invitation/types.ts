import type { MemberPortalInvitationStatus } from "@/lib/firestore/types";

export const MAX_MEMBER_PORTAL_INVITE_ATTEMPTS = 3;

/** How long a worker holds an in-flight invitation send lease. */
export const MEMBER_PORTAL_INVITE_LEASE_MS = 5 * 60 * 1000;

export type MemberPortalInvitationClaimResult =
  | { ok: true; attemptNumber: number; idempotencyKey: string }
  | {
      ok: false;
      reason:
        | "already_sent"
        | "max_attempts"
        | "in_flight"
        | "missing"
        | "not_configured"
        | "failed_final";
    };

export type MemberPortalInvitationProcessResult =
  | "sent"
  | "not_configured"
  | "send_failed"
  | "skipped_already_sent"
  | "skipped_max_attempts"
  | "skipped_in_flight"
  | "skipped_member_missing";

export type MemberPortalInvitationSummary = {
  status: MemberPortalInvitationStatus | null;
  recipientEmail: string | null;
  lastAttemptAt: Date | null;
};

export function formatInvitationStatusLabel(
  status: MemberPortalInvitationSummary["status"],
): string {
  switch (status) {
    case "PENDING":
      return "Pending";
    case "SENT":
      return "Sent";
    case "FAILED":
      return "Failed";
    case "NOT_CONFIGURED":
      return "Not configured";
    default:
      return "—";
  }
}
