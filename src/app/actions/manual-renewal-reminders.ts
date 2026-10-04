"use server";

import { z } from "zod";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import {
  countBulkManualRenewalEmailRecipients,
  sendManualRenewalReminderToMember,
  sendManualRenewalRemindersBulk,
} from "@/lib/manual-renewal-reminders/send";
import type {
  ManualRenewalReminderVariant,
  ManualRenewalSendSummary,
} from "@/lib/manual-renewal-reminders/types";
import { canManageNotificationSettings } from "@/lib/permissions";
import { requireGym } from "@/lib/session";

const variantSchema = z.enum(["expired", "upcoming"]);

const singleSendSchema = z.object({
  memberId: z.string().trim().min(1),
  expectedEndDate: z.string().trim().min(1),
  variant: variantSchema,
});

const bulkSendSchema = z.object({
  variant: variantSchema,
  q: z.string().optional(),
});

type GlobalManualSendLocks = typeof globalThis & {
  __gymdeskManualRenewalSendLocks?: Set<string>;
};

function getSendLocks(): Set<string> {
  const g = globalThis as GlobalManualSendLocks;
  if (!g.__gymdeskManualRenewalSendLocks) {
    g.__gymdeskManualRenewalSendLocks = new Set();
  }
  return g.__gymdeskManualRenewalSendLocks;
}

function summaryMessage(summary: ManualRenewalSendSummary): string {
  return `Sent ${summary.sent}, skipped (no email) ${summary.skippedNoEmail}, failed ${summary.failed}.`;
}

function resultToSummary(
  result: Awaited<ReturnType<typeof sendManualRenewalReminderToMember>>,
): ManualRenewalSendSummary {
  if (result.status === "sent") {
    return { sent: 1, skippedNoEmail: 0, failed: 0 };
  }
  if (result.status === "skipped_no_email") {
    return { sent: 0, skippedNoEmail: 1, failed: 0 };
  }
  if (result.status === "failed") {
    return { sent: 0, skippedNoEmail: 0, failed: 1 };
  }
  return { sent: 0, skippedNoEmail: 0, failed: 0 };
}

async function requireOwner():
  Promise<
    | { user: Awaited<ReturnType<typeof requireGym>> }
    | { error: ActionResult<never> }
  > {
  const user = await requireGym();
  if (!canManageNotificationSettings(user.role)) {
    return { error: actionError("Only the gym owner can send manual reminders.") };
  }
  return { user };
}

export async function sendManualRenewalReminderAction(
  memberId: string,
  expectedEndDateIso: string,
  variant: ManualRenewalReminderVariant,
): Promise<ActionResult<ManualRenewalSendSummary>> {
  const owner = await requireOwner();
  if ("error" in owner) return owner.error;

  const parsed = singleSendSchema.safeParse({
    memberId,
    expectedEndDate: expectedEndDateIso,
    variant,
  });
  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? "Invalid input.");
  }

  const lockKey = `single:${owner.user.gymId}:${parsed.data.memberId}`;
  const locks = getSendLocks();
  if (locks.has(lockKey)) {
    return actionError("A reminder send is already in progress for this member.");
  }

  locks.add(lockKey);
  try {
    const expectedEndDate = new Date(parsed.data.expectedEndDate);
    if (Number.isNaN(expectedEndDate.getTime())) {
      return actionError("Invalid expiry date.");
    }

    const result = await sendManualRenewalReminderToMember(
      owner.user.gymId,
      parsed.data.memberId,
      parsed.data.variant,
      expectedEndDate,
    );

    if (result.status === "failed") {
      return actionError(result.error);
    }
    if (result.status === "skipped_no_email") {
      return actionOk("Member has no email on file.", resultToSummary(result));
    }
    if (result.status === "skipped_ineligible") {
      return actionError(
        "This member is no longer eligible for a reminder on this subscription.",
      );
    }

    return actionOk("Reminder email sent.", resultToSummary(result));
  } finally {
    locks.delete(lockKey);
  }
}

export async function sendManualRenewalRemindersBulkAction(
  variant: ManualRenewalReminderVariant,
  q?: string,
): Promise<ActionResult<ManualRenewalSendSummary>> {
  const owner = await requireOwner();
  if ("error" in owner) return owner.error;

  const parsed = bulkSendSchema.safeParse({ variant, q });
  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? "Invalid input.");
  }

  const lockKey = `bulk:${owner.user.gymId}:${parsed.data.variant}:${parsed.data.q ?? ""}`;
  const locks = getSendLocks();
  if (locks.has(lockKey)) {
    return actionError("A bulk reminder send is already in progress.");
  }

  locks.add(lockKey);
  try {
    const summary = await sendManualRenewalRemindersBulk(
      owner.user.gymId,
      parsed.data.variant,
      parsed.data.q,
    );
    return actionOk(summaryMessage(summary), summary);
  } finally {
    locks.delete(lockKey);
  }
}

export async function getManualRenewalBulkRecipientCountAction(
  variant: ManualRenewalReminderVariant,
  q?: string,
): Promise<ActionResult<{ count: number }>> {
  const owner = await requireOwner();
  if ("error" in owner) return owner.error;

  const parsed = bulkSendSchema.safeParse({ variant, q });
  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? "Invalid input.");
  }

  const count = await countBulkManualRenewalEmailRecipients(
    owner.user.gymId,
    parsed.data.variant,
    parsed.data.q,
  );
  return actionOk(undefined, { count });
}
