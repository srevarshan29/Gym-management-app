"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import {
  getRepositories,
  renewWithSubscription,
  writeOffSubscriptionInTransaction,
} from "@/lib/firestore";
import { staffContextFromUser } from "@/lib/firestore/session-context";
import { schedulePaymentLogged } from "@/lib/notifications";
import { canLogPayments, canWriteOffDues } from "@/lib/permissions";
import { requireGym } from "@/lib/session";
import { RENEWAL_OVERLAP_ERROR } from "@/lib/subscription-renewal";
import { statusFromEndDate } from "@/lib/subscription";

const renewSchema = z.object({
  memberId: z.string().min(1),
  packageId: z.string().min(1, "Select a package"),
  logPayment: z.enum(["0", "1"]).default("0"),
  amount: z.string().optional(),
  method: z.enum(["CASH", "UPI", "CARD", "BANK_TRANSFER", "OTHER"]).default("CASH"),
  activeMembershipConfirmed: z.enum(["0", "1"]).optional(),
});

export type RenewSubscriptionData = { paymentId: string | null };

export async function renewSubscription(
  _prev: ActionResult<RenewSubscriptionData> | undefined,
  formData: FormData,
): Promise<ActionResult<RenewSubscriptionData>> {
  const user = await requireGym();
  const tenantGymId = user.gymId;
  const ctx = staffContextFromUser(user);
  const { members, packages, subscriptions } = getRepositories();

  const parsed = renewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? "Invalid input.");
  }
  const data = parsed.data;

  const member = await members.findByIdAndGym(ctx, data.memberId, tenantGymId);
  if (!member) return actionError("Member not found.");

  const pkg = await packages.findById(ctx, tenantGymId, data.packageId);
  if (!pkg) return actionError("Selected package no longer exists.");

  const subs = await subscriptions.listByMember(ctx, tenantGymId, data.memberId);
  const latestEnd = subs.length
    ? subs.reduce(
        (max, s) =>
          s.endDate.toDate().getTime() > max.getTime()
            ? s.endDate.toDate()
            : max,
        subs[0]!.endDate.toDate(),
      )
    : null;
  const status = statusFromEndDate(latestEnd);
  const needsConfirm =
    status === "ACTIVE" || status === "EXPIRING_SOON";
  if (needsConfirm && data.activeMembershipConfirmed !== "1") {
    return actionError(
      "Confirm that the new membership should start after the current period.",
    );
  }

  const logPayment = data.logPayment === "1";
  if (logPayment && !canLogPayments(user.role)) {
    return actionError("You do not have permission to record payments.");
  }
  const amount =
    data.amount && data.amount.trim() !== ""
      ? Number(data.amount)
      : Number(pkg.price);
  if (logPayment && (Number.isNaN(amount) || amount < 0)) {
    return actionError("Invalid payment amount.");
  }

  try {
    const { paymentId } = await renewWithSubscription({
      gymId: tenantGymId,
      memberId: data.memberId,
      memberName: member.name,
      memberNumber: member.memberNumber,
      packageId: pkg.id,
      packageName: pkg.name,
      packagePrice: pkg.price,
      durationValue: pkg.durationValue,
      durationUnit: pkg.durationUnit,
      createdById: user.id,
      logPayment,
      paymentAmount: logPayment ? amount : undefined,
      paymentMethod: data.method,
    });

    revalidatePath(`/members/${data.memberId}`);
    revalidatePath("/members");
    revalidatePath("/");
    revalidatePath("/payments");
    revalidatePath("/finance/pending-dues");

    if (paymentId) {
      schedulePaymentLogged(tenantGymId, paymentId);
    }

    return actionOk("Subscription renewed.", { paymentId });
  } catch (error) {
    if (error instanceof Error && error.message === RENEWAL_OVERLAP_ERROR) {
      return actionError(error.message);
    }
    throw error;
  }
}

export async function writeOffSubscriptionDues(
  subscriptionId: string,
): Promise<ActionResult> {
  const user = await requireGym();
  if (!canWriteOffDues(user.role)) {
    return actionError("Only the gym owner can write off outstanding dues.");
  }
  const id = subscriptionId.trim();
  if (!id) return actionError("Missing subscription id.");

  try {
    const { memberId } = await writeOffSubscriptionInTransaction(
      user.gymId,
      id,
      user.id,
    );
    revalidatePath(`/members/${memberId}`);
    revalidatePath("/members");
    revalidatePath("/");
    revalidatePath("/payments");
    revalidatePath("/finance/pending-dues");
    return actionOk(
      "Outstanding balance written off. Payment history is unchanged.",
    );
  } catch (error) {
    return actionError(
      error instanceof Error ? error.message : "Write-off failed.",
    );
  }
}
