"use server";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { sendInactiveMemberRemindersBulk } from "@/lib/inactive-member-reminders/send";
import { countInactiveMemberEmailRecipients } from "@/lib/inactive-member-reminders/targets";
import type { InactiveMemberSendSummary } from "@/lib/inactive-member-reminders/types";
import { canManageNotificationSettings } from "@/lib/permissions";
import { requireGym } from "@/lib/session";

type GlobalInactiveSendLocks = typeof globalThis & {
  __gymdeskInactiveMemberSendLocks?: Set<string>;
};

function getSendLocks(): Set<string> {
  const g = globalThis as GlobalInactiveSendLocks;
  if (!g.__gymdeskInactiveMemberSendLocks) {
    g.__gymdeskInactiveMemberSendLocks = new Set();
  }
  return g.__gymdeskInactiveMemberSendLocks;
}

function summaryMessage(summary: InactiveMemberSendSummary): string {
  return `Sent ${summary.sent}, skipped (ineligible) ${summary.skippedIneligible}, skipped (already sent) ${summary.skippedDuplicate}, failed ${summary.failed}.`;
}

async function requireOwner():
  Promise<
    | { user: Awaited<ReturnType<typeof requireGym>> }
    | { error: ActionResult<never> }
  > {
  const user = await requireGym();
  if (!canManageNotificationSettings(user.role)) {
    return { error: actionError("Only the gym owner can send inactive member emails.") };
  }
  return { user };
}

export async function getInactiveMemberBulkRecipientCountAction(): Promise<
  ActionResult<{ count: number }>
> {
  const owner = await requireOwner();
  if ("error" in owner) return owner.error;

  const count = await countInactiveMemberEmailRecipients(owner.user.gymId);
  return actionOk(undefined, { count });
}

export async function sendInactiveMemberRemindersBulkAction(): Promise<
  ActionResult<InactiveMemberSendSummary>
> {
  const owner = await requireOwner();
  if ("error" in owner) return owner.error;

  const lockKey = `bulk:inactive:${owner.user.gymId}`;
  const locks = getSendLocks();
  if (locks.has(lockKey)) {
    return actionError("An inactive member email send is already in progress.");
  }

  locks.add(lockKey);
  try {
    const summary = await sendInactiveMemberRemindersBulk(owner.user.gymId);
    return actionOk(summaryMessage(summary), summary);
  } finally {
    locks.delete(lockKey);
  }
}
