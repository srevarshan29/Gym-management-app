"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { withTenant } from "@/lib/db-context";
import { requireGym } from "@/lib/session";
import { canLogPayments } from "@/lib/permissions";
import { createReceiptForPayment } from "@/lib/receipts";
import { notifyPaymentLogged } from "@/lib/notifications";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";

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
  const gymId = user.gymId;
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

  const member = await withTenant(gymId, (tx) =>
    tx.member.findFirst({
      where: { id: data.memberId, gymId },
      select: { id: true },
    }),
  );
  if (!member) return actionError("Member not found.");

  if (data.subscriptionId) {
    const subscription = await withTenant(gymId, (tx) =>
      tx.subscription.findFirst({
        where: { id: data.subscriptionId, gymId, memberId: data.memberId },
        select: { id: true },
      }),
    );
    if (!subscription) return actionError("Subscription not found.");
  }

  const payment = await withTenant(gymId, async (tx) => {
    const created = await tx.payment.create({
      data: {
        gymId,
        memberId: data.memberId,
        subscriptionId: data.subscriptionId || null,
        amount: data.amount,
        method: data.method,
        paidAt,
        note: data.note || null,
        recordedById: user.id,
      },
    });
    await createReceiptForPayment(tx, gymId, created.id);
    return created;
  });

  revalidatePath("/payments");
  revalidatePath(`/members/${data.memberId}`);
  revalidatePath("/members");
  revalidatePath("/");

  notifyPaymentLogged(gymId, payment.id).catch((err) =>
    console.error("[payments] notifyPaymentLogged failed:", err),
  );

  return actionOk("Payment recorded.", { paymentId: payment.id });
}
