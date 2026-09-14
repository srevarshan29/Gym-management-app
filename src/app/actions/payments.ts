"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { logPaymentWithReceipt } from "@/lib/firestore";
import { notifyPaymentLogged } from "@/lib/notifications";
import { canLogPayments } from "@/lib/permissions";
import { requireGym } from "@/lib/session";
import { staffContextFromUser } from "@/lib/firestore/session-context";
import { getRepositories } from "@/lib/firestore";

const paymentSchema = z.object({
  memberId: z.string().min(1),
  subscriptionId: z.string().optional(),
  amount: z.coerce.number().min(0, "Amount must be zero or more"),
  method: z.enum(["CASH", "UPI", "CARD", "BANK_TRANSFER", "OTHER"]).default("CASH"),
  paidAt: z.string().optional(),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

export type LogPaymentData = { paymentId: string };

export async function logPayment(
  _prev: ActionResult<LogPaymentData> | undefined,
  formData: FormData,
): Promise<ActionResult<LogPaymentData>> {
  const user = await requireGym();
  const tenantGymId = user.gymId;
  if (!canLogPayments(user.role)) {
    return actionError("You do not have permission to record payments.");
  }

  const parsed = paymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? "Invalid input.");
  }
  const data = parsed.data;

  const paidAt = data.paidAt ? new Date(data.paidAt) : new Date();
  if (Number.isNaN(paidAt.getTime())) {
    return actionError("Invalid payment date.");
  }

  const ctx = staffContextFromUser(user);
  const { members, subscriptions } = getRepositories();

  const member = await members.findByIdAndGym(
    ctx,
    data.memberId,
    tenantGymId,
  );
  if (!member) return actionError("Member not found.");

  if (data.subscriptionId) {
    const subscription = await subscriptions.findById(
      ctx,
      tenantGymId,
      data.subscriptionId,
    );
    if (!subscription || subscription.memberId !== data.memberId) {
      return actionError("Subscription not found.");
    }
  }

  const payment = await logPaymentWithReceipt({
    gymId: tenantGymId,
    memberId: data.memberId,
    subscriptionId: data.subscriptionId || null,
    amount: data.amount,
    method: data.method,
    paidAt,
    note: data.note || null,
    recordedById: user.id,
  });

  revalidatePath("/payments");
  revalidatePath(`/members/${data.memberId}`);
  revalidatePath("/members");
  revalidatePath("/");
  revalidatePath("/finance/pending-dues");

  if (!payment.isDuplicate) {
    notifyPaymentLogged(tenantGymId, payment.paymentId).catch((err) =>
      console.error("[payments] notifyPaymentLogged failed:", err),
    );
  }

  return actionOk("Payment recorded.", { paymentId: payment.paymentId });
}
