export type ManualRenewalReminderVariant = "expired" | "upcoming";

export type ManualRenewalSendSummary = {
  sent: number;
  skippedNoEmail: number;
  failed: number;
};

export type ManualRenewalMemberSendResult =
  | { status: "sent" }
  | { status: "skipped_no_email" }
  | { status: "skipped_ineligible" }
  | { status: "failed"; error: string };
