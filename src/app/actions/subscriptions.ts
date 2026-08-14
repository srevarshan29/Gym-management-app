"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { withTenant } from "@/lib/db-context";
import { requireGym } from "@/lib/session";
import { canLogPayments, canWriteOffDues } from "@/lib/permissions";
import { computeEndDate } from "@/lib/subscription";
import { createReceiptForPayment } from "@/lib/receipts";
import { notifyPaymentLogged } from "@/lib/notifications";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import {
  computeSubscriptionBalance,
  sumPaymentAmounts,
} from "@/lib/subscription-balance";
import { Prisma } from "@prisma/client";

const renewSchema = z.object({
  memberId: z.string().min(1),
  packageId: z.string().min(1, "Select a package"),
  logPayment: z.enum(["0", "1"]).default("0"),
  amount: z.string().optional(),
  method: z.enum(["CASH", "UPI", "CARD", "BANK_TRANSFER", "OTHER"]).default("CASH"),
});

export type RenewSubscriptionData = { paymentId: string | null };

/**
 * Renew a member: creates a new subscription. The new cycle starts at the
 * later of today or the member's current end date so paid-up time is not lost.
 */
export async function renewSubscription(
  _prev: ActionResult<RenewSubscriptionData> | undefined,
  formData: FormData,
): Promise<ActionResult<RenewSubscriptionData>> {
  const user = await requireGym();
  const tenantGymId = user.gymId;

  const parsed = renewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? "Invalid input.");
  }
  const data = parsed.data;

  const member = await withTenant(tenantGymId, (tx) =>
    tx.member.findFirst({
      where: { id: data.memberId, gymId: tenantGymId },
      select: { id: true },
    }),
  );
  if (!member) return actionError("Member not found.");

  const pkg = await withTenant(tenantGymId, (tx) =>
    tx.package.findFirst({
      where: { id: data.packageId, gymId: tenantGymId },
    }),
  );
  if (!pkg) return actionError("Selected package no longer exists.");

  const latest = await withTenant(tenantGymId, (tx) =>
    tx.subscription.findFirst({
      where: { memberId: data.memberId, gymId: tenantGymId },
      orderBy: { endDate: "desc" },
    }),
  );

  const now = new Date();
  const startDate =
    latest && latest.endDate > now ? new Date(latest.endDate) : now;
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

  const paymentId = await withTenant(tenantGymId, async (tx) => {
    const subscription = await tx.subscription.create({
      data: {
        gymId: tenantGymId,
        memberId: data.memberId,
        packageId: pkg.id,
        startDate,
        endDate,
        priceAtPurchase: pkg.price,
        createdById: user.id,
      },
    });

    if (logPayment) {
      const payment = await tx.payment.create({
        data: {
          gymId: tenantGymId,
          memberId: data.memberId,
          subscriptionId: subscription.id,
          amount,
          method: data.method,
          recordedById: user.id,
        },
      });
      await createReceiptForPayment(tx, tenantGymId, payment.id);
      return payment.id;
    }
    return null;
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

/** Owner-only: forgive remaining dues on one subscription cycle. Does not create or delete payments. */
export async function writeOffSubscriptionDues(
  subscriptionId: string,
): Promise<ActionResult> {
  const user = await requireGym();
  if (!canWriteOffDues(user.role)) {
    return actionError("Only the gym owner can write off outstanding dues.");
  }
  const tenantGymId = user.gymId;
  const id = subscriptionId.trim();
  if (!id) return actionError("Missing subscription id.");

  const result = await withTenant(tenantGymId, async (tx) => {
    const subscription = await tx.subscription.findFirst({
      where: { id, gymId: tenantGymId },
      select: {
        id: true,
        memberId: true,
        priceAtPurchase: true,
        writtenOffAmount: true,
        payments: { select: { amount: true } },
      },
    });
    if (!subscription) {
      return { ok: false as const, error: "Subscription not found." };
    }

    const balance = computeSubscriptionBalance(
      Number(subscription.priceAtPurchase),
      sumPaymentAmounts(subscription.payments),
      Number(subscription.writtenOffAmount),
    );
    if (balance.pendingAmount <= 0) {
      return {
        ok: false as const,
        error: "This subscription has no outstanding balance.",
      };
    }

    const nextWrittenOff = balance.writtenOffAmount + balance.pendingAmount;
    await tx.subscription.updateMany({
      where: { id: subscription.id, gymId: tenantGymId },
      data: {
        writtenOffAmount: new Prisma.Decimal(nextWrittenOff),
        writtenOffAt: new Date(),
        writtenOffById: user.id,
      },
    });
    return { ok: true as const, memberId: subscription.memberId };
  });

  if (!result.ok) {
    return actionError(result.error);
  }

  revalidatePath(`/members/${result.memberId}`);
  revalidatePath("/members");
  revalidatePath("/");
  revalidatePath("/payments");
  revalidatePath("/finance/pending-dues");
  return actionOk("Outstanding balance written off. Payment history is unchanged.");
}
