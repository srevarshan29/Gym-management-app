import { Timestamp } from "firebase-admin/firestore";

import {
  bumpMemberSeq,
  bumpReceiptSeq,
  runBillingTransaction,
  type BillingTransaction,
} from "@/lib/firestore/billing-transaction";
import { COLLECTIONS } from "@/lib/firestore/collections";
import { buildMemberSearchTokens } from "@/lib/firestore/member-search";
import {
  adjustMemberPendingTotal,
  computeSubscriptionPendingFields,
} from "@/lib/firestore/pending-sync";
import { newDocId } from "@/lib/firestore/helpers";
import { omitUndefined, serverTimestamps } from "@/lib/firestore/serialize";
import type {
  MemberDoc,
  MemberGender,
  PaymentDoc,
  PaymentMethod,
  SubscriptionDoc,
} from "@/lib/firestore/types";
import { getGymProfilePlatform } from "@/lib/gym-profile";
import { adjustPtMemberCounter } from "@/lib/firestore/pt-member-counter";
import { ReceiptsRepository } from "@/lib/firestore/repositories/receipts";
import { SubscriptionsRepository } from "@/lib/firestore/repositories/subscriptions";
import { getFirestoreDb } from "@/lib/firebase/admin";
import type { FitnessGoal } from "@/lib/firestore/types";

export type CreateMemberBillingInput = {
  gymId: string;
  name: string;
  phone: string;
  email: string;
  gender: MemberGender;
  notes: string | null;
  isPt: boolean;
  trainerId: string | null;
  fitnessGoal: FitnessGoal | null;
  ageYears: number | null;
  heightCm: number | null;
  weightKg: number | null;
  membershipPolicyAgreedText: string | null;
  membershipPolicyAgreedAt: Date | null;
  packageId: string;
  packageName: string;
  packagePrice: number;
  startDate: Date;
  endDate: Date;
  createdById: string;
  createdByName: string;
  logPayment: boolean;
  paymentAmount?: number;
  paymentMethod?: PaymentMethod;
};

export type CreateMemberBillingResult = {
  memberId: string;
  paymentId: string | null;
};

export type LogPaymentBillingInput = {
  gymId: string;
  memberId: string;
  subscriptionId: string | null;
  amount: number;
  method: PaymentMethod;
  paidAt: Date;
  note: string | null;
  recordedById: string;
};

export type LogPaymentBillingResult = {
  paymentId: string;
  isDuplicate: boolean;
};

export type RenewBillingInput = {
  gymId: string;
  memberId: string;
  memberName: string;
  memberNumber: number;
  packageId: string;
  packageName: string;
  packagePrice: number;
  startDate: Date;
  endDate: Date;
  createdById: string;
  logPayment: boolean;
  paymentAmount?: number;
  paymentMethod?: PaymentMethod;
};

const subscriptionsRepo = () =>
  new SubscriptionsRepository(getFirestoreDb());
const receiptsRepo = () => new ReceiptsRepository(getFirestoreDb());

function memberRef(btx: BillingTransaction, memberId: string) {
  return btx.db.collection(COLLECTIONS.members).doc(memberId);
}

function subscriptionRef(btx: BillingTransaction, subscriptionId: string) {
  return btx.db.collection(COLLECTIONS.subscriptions).doc(subscriptionId);
}

function paymentRef(btx: BillingTransaction, paymentId: string) {
  return btx.db.collection(COLLECTIONS.payments).doc(paymentId);
}

function receiptRef(btx: BillingTransaction, receiptId: string) {
  return btx.db.collection(COLLECTIONS.receipts).doc(receiptId);
}

async function loadGymProfile(gymId: string) {
  const profile = await getGymProfilePlatform(gymId);
  return {
    name: profile.name,
    address: profile.address,
    phone: profile.phone,
    logoUrl: profile.logoUrl,
  };
}

function writeReceiptInTransaction(
  btx: BillingTransaction,
  gymProfile: Awaited<ReturnType<typeof loadGymProfile>>,
  payment: PaymentDoc & { id: string },
  member: MemberDoc,
  subscription: (SubscriptionDoc & { id: string }) | null,
  paidTotalForSubscription: number | null,
  receiptNumber: number,
): string {
  const built = receiptsRepo().createForPaymentInTransaction(btx, {
    payment,
    member,
    subscription,
    paidTotalForSubscription,
    gymProfile,
  });
  const receiptData = { ...built, number: receiptNumber };
  btx.tx.set(receiptRef(btx, built.id), receiptData);
  return built.id;
}

export async function createMemberWithSubscription(
  input: CreateMemberBillingInput,
): Promise<CreateMemberBillingResult> {
  const gymProfile = await loadGymProfile(input.gymId);
  const subsHelper = subscriptionsRepo();

  const result = await runBillingTransaction(input.gymId, async (btx) => {
    // --- Phase 1: reads (gym already loaded on btx) ---
    const memberNumber = await bumpMemberSeq(btx);
    let receiptNumber: number | null = null;
    if (input.logPayment) {
      receiptNumber = await bumpReceiptSeq(btx);
    }

    // #region agent log
    fetch("http://127.0.0.1:7469/ingest/49c9d7e5-cf6e-48b1-912f-8ac4d15f6801", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "f932d8",
      },
      body: JSON.stringify({
        sessionId: "f932d8",
        runId: "pre-fix",
        hypothesisId: "A",
        location: "operations.ts:createMemberWithSubscription",
        message: "seq bumps done, starting document writes",
        data: {
          memberNumber,
          receiptNumber,
          logPayment: input.logPayment,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    const memberId = newDocId();
    const now = Timestamp.now();
    const searchTokens = buildMemberSearchTokens(
      input.name,
      input.phone,
      memberNumber,
    );

    const subBuilt = subsHelper.buildSubscriptionData(input.gymId, {
      memberId,
      packageId: input.packageId,
      packageName: input.packageName,
      memberName: input.name,
      memberNumber,
      startDate: input.startDate,
      endDate: input.endDate,
      priceAtPurchase: input.packagePrice,
      createdById: input.createdById,
      initialPaidTotal: input.logPayment ? (input.paymentAmount ?? 0) : 0,
    });

    let pendingTotal = subBuilt.pendingAmount;
    let paymentId: string | null = null;

    const memberData: MemberDoc = omitUndefined({
      gymId: input.gymId,
      memberNumber,
      name: input.name,
      nameLower: input.name.trim().toLowerCase(),
      phone: input.phone,
      phoneDigits: input.phone.replace(/\D/g, ""),
      searchTokens,
      email: input.email,
      photoUrl: null,
      gender: input.gender,
      notes: input.notes,
      isPt: input.isPt,
      trainerId: input.trainerId,
      membershipPolicyAgreedText: input.membershipPolicyAgreedText,
      membershipPolicyAgreedAt: input.membershipPolicyAgreedAt
        ? Timestamp.fromDate(input.membershipPolicyAgreedAt)
        : null,
      portalEnabledAt: null,
      ageYears: input.ageYears,
      heightCm: input.heightCm,
      weightKg: input.weightKg,
      fitnessGoal: input.fitnessGoal,
      pendingAmountTotal: pendingTotal,
      currentSubscriptionId: subBuilt.id,
      currentStartDate: subBuilt.startDate,
      currentEndDate: subBuilt.endDate,
      currentPackageName: input.packageName,
      addedByName: input.createdByName,
      ...serverTimestamps(now),
    });

    btx.tx.set(memberRef(btx, memberId), memberData);
    btx.tx.set(subscriptionRef(btx, subBuilt.id), subBuilt);

    if (input.logPayment) {
      const payId = newDocId();
      const payment: PaymentDoc = omitUndefined({
        gymId: input.gymId,
        memberId,
        subscriptionId: subBuilt.id,
        amount: input.paymentAmount ?? input.packagePrice,
        method: input.paymentMethod ?? "CASH",
        paidAt: Timestamp.fromDate(input.startDate),
        note: null,
        recordedById: input.createdById,
        createdAt: now,
      });
      btx.tx.set(paymentRef(btx, payId), payment);

      writeReceiptInTransaction(
        btx,
        gymProfile,
        { id: payId, ...payment },
        memberData,
        subBuilt,
        payment.amount,
        receiptNumber!,
      );
      paymentId = payId;
    }

    return { memberId, paymentId };
  });

  if (input.isPt) {
    await adjustPtMemberCounter(input.gymId, 1);
  }

  return result;
}

export async function renewWithSubscription(
  input: RenewBillingInput,
): Promise<{ paymentId: string | null }> {
  const gymProfile = await loadGymProfile(input.gymId);
  const subsHelper = subscriptionsRepo();

  return runBillingTransaction(input.gymId, async (btx) => {
    // --- Phase 1: reads ---
    const memberSnap = await btx.tx.get(memberRef(btx, input.memberId));
    if (!memberSnap.exists) throw new Error("Member not found.");
    const member = memberSnap.data() as MemberDoc;
    if (member.gymId !== input.gymId) throw new Error("Member not found.");

    let receiptNumber: number | null = null;
    if (input.logPayment) {
      receiptNumber = await bumpReceiptSeq(btx);
    }

    const subBuilt = subsHelper.buildSubscriptionData(input.gymId, {
      memberId: input.memberId,
      packageId: input.packageId,
      packageName: input.packageName,
      memberName: input.memberName,
      memberNumber: input.memberNumber,
      startDate: input.startDate,
      endDate: input.endDate,
      priceAtPurchase: input.packagePrice,
      createdById: input.createdById,
      initialPaidTotal: input.logPayment ? (input.paymentAmount ?? 0) : 0,
    });

    btx.tx.set(subscriptionRef(btx, subBuilt.id), subBuilt);

    const pendingTotal = adjustMemberPendingTotal(
      member.pendingAmountTotal,
      subBuilt.pendingAmount,
    );
    const currentPatch = subsHelper.memberCurrentSubscriptionPatch(
      member,
      subBuilt,
      null,
    );

    btx.tx.update(memberRef(btx, input.memberId), {
      pendingAmountTotal: pendingTotal,
      ...currentPatch,
      updatedAt: Timestamp.now(),
    });

    let paymentId: string | null = null;
    if (input.logPayment) {
      const payId = newDocId();
      const now = Timestamp.now();
      const payment: PaymentDoc = omitUndefined({
        gymId: input.gymId,
        memberId: input.memberId,
        subscriptionId: subBuilt.id,
        amount: input.paymentAmount ?? input.packagePrice,
        method: input.paymentMethod ?? "CASH",
        paidAt: now,
        note: null,
        recordedById: input.createdById,
        createdAt: now,
      });
      btx.tx.set(paymentRef(btx, payId), payment);

      writeReceiptInTransaction(
        btx,
        gymProfile,
        { id: payId, ...payment },
        { ...member, pendingAmountTotal: pendingTotal, ...currentPatch },
        subBuilt,
        payment.amount,
        receiptNumber!,
      );
      paymentId = payId;
    }

    return { paymentId };
  });
}

export async function logPaymentWithReceipt(
  input: LogPaymentBillingInput,
): Promise<LogPaymentBillingResult> {
  const db = getFirestoreDb();
  const windowStart = new Date(input.paidAt.getTime() - 60_000);
  const dupSnap = await db
    .collection(COLLECTIONS.payments)
    .where("gymId", "==", input.gymId)
    .where("memberId", "==", input.memberId)
    .where("amount", "==", input.amount)
    .where("method", "==", input.method)
    .where("paidAt", ">=", Timestamp.fromDate(windowStart))
    .where("paidAt", "<=", Timestamp.fromDate(input.paidAt))
    .limit(1)
    .get();
  if (!dupSnap.empty) {
    return { paymentId: dupSnap.docs[0]!.id, isDuplicate: true };
  }

  const gymProfile = await loadGymProfile(input.gymId);

  return runBillingTransaction(input.gymId, async (btx) => {
    // --- Phase 1: reads ---
    const memberSnap = await btx.tx.get(memberRef(btx, input.memberId));
    if (!memberSnap.exists) throw new Error("Member not found.");
    const member = memberSnap.data() as MemberDoc;

    let subscription: (SubscriptionDoc & { id: string }) | null = null;
    let paidTotalForSub: number | null = null;
    let pendingDelta = 0;

    if (input.subscriptionId) {
      const subSnap = await btx.tx.get(
        subscriptionRef(btx, input.subscriptionId),
      );
      if (!subSnap.exists) throw new Error("Subscription not found.");
      subscription = { id: subSnap.id, ...(subSnap.data() as SubscriptionDoc) };
      if (
        subscription.gymId !== input.gymId ||
        subscription.memberId !== input.memberId
      ) {
        throw new Error("Subscription not found.");
      }
      const oldPending = subscription.pendingAmount;
      const paidTotal = subscription.paidTotal + input.amount;
      const fields = computeSubscriptionPendingFields(
        subscription.priceAtPurchase,
        paidTotal,
        subscription.writtenOffAmount,
      );
      subscription = { ...subscription, ...fields };
      pendingDelta = fields.pendingAmount - oldPending;
      paidTotalForSub = paidTotal;
    }

    const receiptNumber = await bumpReceiptSeq(btx);

    // --- Phase 2: writes ---
    if (input.subscriptionId && subscription) {
      btx.tx.update(subscriptionRef(btx, subscription.id), {
        paidTotal: subscription.paidTotal,
        pendingAmount: subscription.pendingAmount,
      });
    }

    const payId = newDocId();
    const now = Timestamp.now();
    const payment: PaymentDoc = omitUndefined({
      gymId: input.gymId,
      memberId: input.memberId,
      subscriptionId: input.subscriptionId,
      amount: input.amount,
      method: input.method,
      paidAt: Timestamp.fromDate(input.paidAt),
      note: input.note,
      recordedById: input.recordedById,
      createdAt: now,
    });
    btx.tx.set(paymentRef(btx, payId), payment);

    writeReceiptInTransaction(
      btx,
      gymProfile,
      { id: payId, ...payment },
      member,
      subscription,
      paidTotalForSub,
      receiptNumber,
    );

    if (pendingDelta !== 0) {
      btx.tx.update(memberRef(btx, input.memberId), {
        pendingAmountTotal: adjustMemberPendingTotal(
          member.pendingAmountTotal,
          pendingDelta,
        ),
        updatedAt: Timestamp.now(),
      });
    }

    return { paymentId: payId, isDuplicate: false };
  });
}

export async function writeOffSubscriptionInTransaction(
  gymId: string,
  subscriptionId: string,
  writtenOffById: string,
): Promise<{ memberId: string }> {
  return runBillingTransaction(gymId, async (btx) => {
    // --- Phase 1: reads ---
    const subSnap = await btx.tx.get(subscriptionRef(btx, subscriptionId));
    if (!subSnap.exists) throw new Error("Subscription not found.");
    const sub = { id: subSnap.id, ...(subSnap.data() as SubscriptionDoc) };
    if (sub.gymId !== gymId) throw new Error("Subscription not found.");

    const memberSnap = await btx.tx.get(memberRef(btx, sub.memberId));

    const balance = computeSubscriptionPendingFields(
      sub.priceAtPurchase,
      sub.paidTotal,
      sub.writtenOffAmount,
    );
    if (balance.pendingAmount <= 0) {
      throw new Error("This subscription has no outstanding balance.");
    }

    // --- Phase 2: writes ---
    const nextWrittenOff = sub.writtenOffAmount + balance.pendingAmount;
    btx.tx.update(subscriptionRef(btx, subscriptionId), {
      writtenOffAmount: nextWrittenOff,
      pendingAmount: 0,
      writtenOffAt: Timestamp.now(),
      writtenOffById,
    });

    if (memberSnap.exists) {
      const member = memberSnap.data() as MemberDoc;
      btx.tx.update(memberRef(btx, sub.memberId), {
        pendingAmountTotal: adjustMemberPendingTotal(
          member.pendingAmountTotal,
          -balance.pendingAmount,
        ),
        updatedAt: Timestamp.now(),
      });
    }

    return { memberId: sub.memberId };
  });
}
