import { Timestamp, type Firestore } from "firebase-admin/firestore";

import { COLLECTIONS } from "@/lib/firestore/collections";
import type { BillingTransaction } from "@/lib/firestore/billing-transaction";
import { bumpReceiptSeq } from "@/lib/firestore/billing-transaction";
import type { FirestoreContext } from "@/lib/firestore/context";
import { assertTenantAccess } from "@/lib/firestore/context";
import { DocumentNotFoundError } from "@/lib/firestore/errors";
import { newDocId } from "@/lib/firestore/helpers";
import type { DocWithId } from "@/lib/firestore/repositories/base";
import { omitUndefined, serverTimestamps } from "@/lib/firestore/serialize";
import type {
  MemberDoc,
  PaymentDoc,
  ReceiptDoc,
  SubscriptionDoc,
} from "@/lib/firestore/types";
import { getGymProfilePlatform } from "@/lib/gym-profile";
import {
  formatReceiptNumber,
  receiptMemberDisplayId,
} from "@/lib/receipt-display";
import { pendingAmount } from "@/lib/subscription-balance";
import type { ReceiptData } from "@/lib/receipts";

export type { ReceiptData };

export { formatReceiptNumber };

/** Resolve memberNumber for legacy receipts missing the snapshot field. */
export async function resolveReceiptMemberNumber(
  db: Firestore,
  gymId: string,
  receipt: Pick<ReceiptDoc, "memberId" | "memberNumber">,
): Promise<number | null> {
  if (receipt.memberNumber != null) {
    return receipt.memberNumber;
  }

  try {
    const memberSnap = await db
      .collection(COLLECTIONS.members)
      .doc(receipt.memberId)
      .get();
    if (!memberSnap.exists) return null;
    const member = memberSnap.data() as MemberDoc;
    if (member.gymId !== gymId) return null;
    return member.memberNumber;
  } catch (err) {
    console.warn("[receipts] memberNumber fallback lookup failed:", err);
    return null;
  }
}

async function toReceiptData(
  db: Firestore,
  gymId: string,
  receipt: DocWithId<ReceiptDoc>,
): Promise<ReceiptData> {
  const memberNumber = await resolveReceiptMemberNumber(db, gymId, receipt);
  return {
    id: receipt.id,
    number: receipt.number,
    createdAt: receipt.createdAt.toDate(),
    gymName: receipt.gymName,
    gymAddress: receipt.gymAddress,
    gymPhone: receipt.gymPhone,
    gymLogoUrl: receipt.gymLogoUrl,
    memberId: receipt.memberId,
    memberNumber,
    memberDisplayId: receiptMemberDisplayId(memberNumber),
    memberName: receipt.memberName,
    memberPhone: receipt.memberPhone,
    memberEmail: receipt.memberEmail,
    packageName: receipt.packageName,
    amount: receipt.amount,
    amountOwed: receipt.amountOwed,
    balanceAfter: receipt.balanceAfter,
    method: receipt.method,
    paidAt: receipt.paidAt.toDate(),
    periodStart: receipt.periodStart?.toDate() ?? null,
    periodEnd: receipt.periodEnd?.toDate() ?? null,
  };
}

export class ReceiptsRepository {
  constructor(private readonly db: Firestore) {}

  private col() {
    return this.db.collection(COLLECTIONS.receipts);
  }

  async findByPaymentId(
    ctx: FirestoreContext,
    gymId: string,
    paymentId: string,
  ): Promise<DocWithId<ReceiptDoc> | null> {
    assertTenantAccess(ctx, gymId);
    const snap = await this.col()
      .where("gymId", "==", gymId)
      .where("paymentId", "==", paymentId)
      .limit(1)
      .get();
    const doc = snap.docs[0];
    if (!doc) return null;
    return { id: doc.id, ...(doc.data() as ReceiptDoc) };
  }

  async mapReceiptNumbersByPaymentIds(
    ctx: FirestoreContext,
    gymId: string,
    paymentIds: string[],
  ): Promise<Map<string, number>> {
    assertTenantAccess(ctx, gymId);
    const map = new Map<string, number>();
    const unique = [...new Set(paymentIds)].filter(Boolean);
    if (unique.length === 0) return map;

    const CHUNK = 30;
    for (let i = 0; i < unique.length; i += CHUNK) {
      const chunk = unique.slice(i, i + CHUNK);
      const snap = await this.col()
        .where("gymId", "==", gymId)
        .where("paymentId", "in", chunk)
        .get();
      for (const doc of snap.docs) {
        const data = doc.data() as ReceiptDoc;
        map.set(data.paymentId, data.number);
      }
    }
    return map;
  }

  /**
   * Create immutable receipt inside a billing transaction.
   * Payment, member, and subscription must already exist in the transaction.
   */
  createForPaymentInTransaction(
    btx: BillingTransaction,
    input: {
      payment: PaymentDoc & { id: string };
      member: MemberDoc;
      subscription: (SubscriptionDoc & { id: string }) | null;
      paidTotalForSubscription: number | null;
      gymProfile: {
        name: string;
        address: string | null;
        phone: string | null;
        logoUrl: string | null;
      };
    },
  ): DocWithId<ReceiptDoc> {
    const receiptId = newDocId();
    let amountOwed: number | null = null;
    let balanceAfter: number | null = null;
    let packageName: string | null = null;
    let periodStart: Timestamp | null = null;
    let periodEnd: Timestamp | null = null;

    if (input.payment.subscriptionId && input.subscription) {
      const owed = input.subscription.priceAtPurchase;
      const paidTotal = input.paidTotalForSubscription ?? input.payment.amount;
      amountOwed = owed;
      balanceAfter = pendingAmount(
        owed,
        paidTotal,
        input.subscription.writtenOffAmount,
      );
      packageName = input.subscription.packageName;
      periodStart = input.subscription.startDate;
      periodEnd = input.subscription.endDate;
    }

    const now = Timestamp.now();
    const receipt: ReceiptDoc = omitUndefined({
      gymId: btx.gymId,
      number: 0,
      paymentId: input.payment.id,
      gymName: input.gymProfile.name,
      gymAddress: input.gymProfile.address,
      gymPhone: input.gymProfile.phone,
      gymLogoUrl: input.gymProfile.logoUrl,
      memberId: input.payment.memberId,
      memberNumber: input.member.memberNumber,
      memberName: input.member.name,
      memberPhone: input.member.phone,
      memberEmail: input.member.email,
      packageName,
      amount: input.payment.amount,
      amountOwed,
      balanceAfter,
      method: input.payment.method,
      paidAt: input.payment.paidAt,
      periodStart,
      periodEnd,
      createdAt: now,
    });

    return { id: receiptId, ...receipt };
  }

  async createForPayment(
    ctx: FirestoreContext,
    gymId: string,
    paymentId: string,
  ): Promise<DocWithId<ReceiptDoc>> {
    assertTenantAccess(ctx, gymId);
    const paymentSnap = await this.db
      .collection(COLLECTIONS.payments)
      .doc(paymentId)
      .get();
    if (!paymentSnap.exists) {
      throw new DocumentNotFoundError(COLLECTIONS.payments, paymentId);
    }
    const payment = {
      id: paymentSnap.id,
      ...(paymentSnap.data() as PaymentDoc),
    };
    if (payment.gymId !== gymId) {
      throw new DocumentNotFoundError(COLLECTIONS.payments, paymentId);
    }

    const memberSnap = await this.db
      .collection(COLLECTIONS.members)
      .doc(payment.memberId)
      .get();
    if (!memberSnap.exists) {
      throw new DocumentNotFoundError(COLLECTIONS.members, payment.memberId);
    }
    const member = memberSnap.data() as MemberDoc;

    let subscription: (SubscriptionDoc & { id: string }) | null = null;
    let paidTotalForSubscription: number | null = null;
    if (payment.subscriptionId) {
      const subSnap = await this.db
        .collection(COLLECTIONS.subscriptions)
        .doc(payment.subscriptionId)
        .get();
      if (subSnap.exists) {
        subscription = { id: subSnap.id, ...(subSnap.data() as SubscriptionDoc) };
        const paySnap = await this.db
          .collection(COLLECTIONS.payments)
          .where("gymId", "==", gymId)
          .where("subscriptionId", "==", payment.subscriptionId)
          .get();
        paidTotalForSubscription = paySnap.docs.reduce(
          (sum, d) => sum + (d.data() as PaymentDoc).amount,
          0,
        );
      }
    }

    const profile = await getGymProfilePlatform(gymId);

    const { runBillingTransaction } = await import(
      "@/lib/firestore/billing-transaction"
    );

    return runBillingTransaction(gymId, async (btx) => {
      const number = await bumpReceiptSeq(btx);
      const built = this.createForPaymentInTransaction(btx, {
        payment,
        member,
        subscription,
        paidTotalForSubscription,
        gymProfile: {
          name: profile.name,
          address: profile.address,
          phone: profile.phone,
          logoUrl: profile.logoUrl,
        },
      });
      const data: ReceiptDoc & { id: string } = { ...built, number };
      btx.tx.set(this.col().doc(built.id), data);
      return data;
    });
  }

  async getOrCreateByPayment(
    ctx: FirestoreContext,
    gymId: string,
    paymentId: string,
  ): Promise<ReceiptData> {
    const existing = await this.findByPaymentId(ctx, gymId, paymentId);
    if (existing) return toReceiptData(this.db, gymId, existing);
    const created = await this.createForPayment(ctx, gymId, paymentId);
    return toReceiptData(this.db, gymId, created);
  }
}
