"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import {
  getRepositories,
  logPaymentWithReceipt,
  renewWithSubscription,
  writeOffSubscriptionInTransaction,
} from "@/lib/firestore";
import { staffContextFromUser } from "@/lib/firestore/session-context";
import { notifyPaymentLogged } from "@/lib/notifications";
import { canLogPayments, canWriteOffDues } from "@/lib/permissions";
import { requireGym } from "@/lib/session";
import { computeEndDate } from "@/lib/subscription";

const renewSchema = z.object({
  memberId: z.string().min(1),
  packageId: z.string().min(1, "Select a package"),
  logPayment: z.enum(["0", "1"]).default("0"),
  amount: z.string().optional(),
  method: z.enum(["CASH", "UPI", "CARD", "BANK_TRANSFER", "OTHER"]).default("CASH"),
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

  const latest = await subscriptions.findLatestByMember(
    ctx,
    tenantGymId,
    data.memberId,
  );

  const now = new Date();
  const startDate =
    latest && latest.endDate.toDate() > now
      ? latest.endDate.toDate()
      : now;
  const endDate = computeEndDate(startDate, pkg.durationValue, pkg.durationUnit);

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

  const { paymentId } = await renewWithSubscription({
    gymId: tenantGymId,
    memberId: data.memberId,
    memberName: member.name,
    memberNumber: member.memberNumber,
    packageId: pkg.id,
    packageName: pkg.name,
    packagePrice: pkg.price,
    startDate,
    endDate,
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
    notifyPaymentLogged(tenantGymId, paymentId).catch((err) =>
      console.error("[subscriptions] notifyPaymentLogged failed:", err),
    );
  }

  return actionOk("Subscription renewed.", { paymentId });
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
