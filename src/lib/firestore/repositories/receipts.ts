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
import { pendingAmount } from "@/lib/subscription-balance";

export type ReceiptData = {
  id: string;
  number: number;
  createdAt: Date;
  gymName: string;
  gymAddress: string | null;
  gymPhone: string | null;
  gymLogoUrl: string | null;
  memberId: string;
  memberName: string;
  memberPhone: string;
  memberEmail: string | null;
  packageName: string | null;
  amount: number;
  amountOwed: number | null;
  balanceAfter: number | null;
  method: string;
  paidAt: Date;
  periodStart: Date | null;
  periodEnd: Date | null;
};

export function formatReceiptNumber(number: number): string {
  return `RCPT-${String(number).padStart(4, "0")}`;
}

function toReceiptData(receipt: DocWithId<ReceiptDoc>): ReceiptData {
  return {
    id: receipt.id,
    number: receipt.number,
    createdAt: receipt.createdAt.toDate(),
    gymName: receipt.gymName,
    gymAddress: receipt.gymAddress,
    gymPhone: receipt.gymPhone,
    gymLogoUrl: receipt.gymLogoUrl,
    memberId: receipt.memberId,
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
    if (existing) return toReceiptData(existing);
    const created = await this.createForPayment(ctx, gymId, paymentId);
    return toReceiptData(created);
  }
}
