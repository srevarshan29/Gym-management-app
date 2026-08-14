"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { withTenant } from "@/lib/db-context";
import { requireGym } from "@/lib/session";
import { canDeleteMembers, canLogPayments } from "@/lib/permissions";
import { computeEndDate } from "@/lib/subscription";
import { createReceiptForPayment } from "@/lib/receipts";
import { nextMemberNumber } from "@/lib/gym-sequence";
import { notifyPaymentLogged } from "@/lib/notifications";
import { uploadMemberPhoto } from "@/lib/storage";
import { validateTrainerForGym } from "@/lib/staff";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { prismaNull } from "@/lib/prisma-safe";
import { getMembershipPolicyForGym } from "@/lib/gym-profile";
import { isMembershipPolicyRequired } from "@/lib/membership-policy";
import { normalizeMemberEmail } from "@/lib/member-portal/constants";
import {
  DUPLICATE_MEMBER_EMAIL_MESSAGE,
  findGymMembersByEmail,
} from "@/lib/member-portal/email";
import {
  fitnessGoalSchema,
  optionalFitnessGoalSchema,
  signupBodyMetricsSchema,
} from "@/lib/fitness-goal";

const memberGenderSchema = z.enum([
  "MALE",
  "FEMALE",
  "OTHER",
  "PREFER_NOT_TO_SAY",
]);

const createSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  phone: z.string().trim().min(3, "Phone number is required").max(30),
  email: z.string().trim().email("Enter a valid email"),
  gender: memberGenderSchema.default("PREFER_NOT_TO_SAY"),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  packageId: z.string().trim().min(1, "Select a package"),
  startDate: z.string().optional(),
  logPayment: z.enum(["0", "1"]).default("0"),
  amount: z.string().optional(),
  method: z.enum(["CASH", "UPI", "CARD", "BANK_TRANSFER", "OTHER"]).default("CASH"),
  isPt: z.enum(["0", "1"]).default("0"),
  trainerId: z.string().optional().or(z.literal("")),
  visitorId: z.string().optional().or(z.literal("")),
  fitnessGoal: fitnessGoalSchema,
}).merge(signupBodyMetricsSchema);

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "Name is required").max(120),
  phone: z.string().trim().min(3, "Phone number is required").max(30),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  gender: memberGenderSchema.default("PREFER_NOT_TO_SAY"),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  isPt: z.enum(["0", "1"]).default("0"),
  trainerId: z.string().optional().or(z.literal("")),
  fitnessGoal: optionalFitnessGoalSchema,
}).merge(signupBodyMetricsSchema);

async function resolvePtFields(
  gymId: string,
  isPtRaw: "0" | "1",
  trainerIdRaw: string | undefined,
): Promise<{ isPt: boolean; trainerId: string | null } | ActionResult> {
  const isPt = isPtRaw === "1";
  if (!isPt) {
    return { isPt: false, trainerId: null };
  }

  const trainerId =
    trainerIdRaw && trainerIdRaw.trim() !== "" ? trainerIdRaw.trim() : null;
  if (trainerId) {
    const valid = await validateTrainerForGym(gymId, trainerId);
    if (!valid) {
      return actionError("Selected trainer is not valid for this gym.");
    }
  }

  return { isPt: true, trainerId };
}

async function persistMemberPhoto(
  tenantGymId: string,
  memberId: string,
  formData: FormData,
): Promise<string | undefined> {
  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0) return undefined;

  const result = await uploadMemberPhoto(photo, memberId);
  if ("error" in result) {
    console.warn(`[members] photo upload failed for ${memberId}:`, result.error);
    return undefined;
  }

  await withTenant(tenantGymId, (tx) =>
    tx.member.updateMany({
      where: { id: memberId, gymId: tenantGymId },
      data: { photoUrl: result.url },
    }),
  );
  return result.url;
}

async function resolvePolicyConsent(
  gymId: string,
  formData: FormData,
): Promise<{ text: string; agreedAt: Date } | ActionResult | null> {
  const policyText = await getMembershipPolicyForGym(gymId);
  if (!isMembershipPolicyRequired(policyText)) return null;
  if (formData.get("agreeMembershipPolicy") !== "1") {
    return actionError(
      "You must agree to the gym's membership policy before adding this member.",
    );
  }
  return { text: policyText!, agreedAt: new Date() };
}

export async function createMember(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireGym();
  const tenantGymId = user.gymId;

  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? "Invalid input.");
  }
  const data = parsed.data;

  const existingPhone = await withTenant(tenantGymId, (tx) =>
    tx.member.findFirst({
      where: { gymId: tenantGymId, phone: data.phone },
      select: { id: true },
    }),
  );
  if (existingPhone) {
    return actionError("A member with this phone number already exists.");
  }

  const existingEmail = await withTenant(tenantGymId, (tx) =>
    findGymMembersByEmail(tx, tenantGymId, data.email),
  );
  if (existingEmail.length > 0) {
    return actionError(DUPLICATE_MEMBER_EMAIL_MESSAGE);
  }

  const pkg = await withTenant(tenantGymId, (tx) =>
    tx.package.findFirst({
      where: { id: data.packageId, gymId: tenantGymId },
    }),
  );
  if (!pkg) return actionError("Selected package no longer exists.");

  const startDate = data.startDate ? new Date(data.startDate) : new Date();
  if (Number.isNaN(startDate.getTime())) {
    return actionError("Invalid start date.");
  }
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

  const ptFields = await resolvePtFields(user.gymId, data.isPt, data.trainerId);
  if ("ok" in ptFields) return ptFields;
  const { isPt, trainerId } = ptFields;

  const policyConsent = await resolvePolicyConsent(tenantGymId, formData);
  if (policyConsent && "ok" in policyConsent) return policyConsent;

  const visitorId = data.visitorId?.trim();
  let visitorMetrics: {
    fitnessGoal: typeof data.fitnessGoal | null;
    ageYears: number | null;
    heightCm: number | null;
    weightKg: number | null;
  } | null = null;
  if (visitorId) {
    const visitor = await withTenant(tenantGymId, (tx) =>
      tx.visitor.findFirst({
        where: {
          id: visitorId,
          gymId: tenantGymId,
          status: "pending",
        },
        select: {
          fitnessGoal: true,
          ageYears: true,
          heightCm: true,
          weightKg: true,
        },
      }),
    );
    if (visitor) {
      visitorMetrics = {
        fitnessGoal: visitor.fitnessGoal,
        ageYears: visitor.ageYears,
        heightCm: visitor.heightCm,
        weightKg:
          visitor.weightKg != null ? Number(visitor.weightKg) : null,
      };
    }
  }

  const fitnessGoal = data.fitnessGoal ?? visitorMetrics?.fitnessGoal ?? null;
  const ageYears = data.ageYears ?? visitorMetrics?.ageYears ?? null;
  const heightCm = data.heightCm ?? visitorMetrics?.heightCm ?? null;
  const weightKg =
    data.weightKg ??
    (visitorMetrics?.weightKg != null
      ? Number(visitorMetrics.weightKg)
      : null);

  const { member, paymentId } = await withTenant(tenantGymId, async (tx) => {
    const memberNumber = await nextMemberNumber(tx, tenantGymId);

    const created = await tx.member.create({
      data: {
        gymId: tenantGymId,
        memberNumber,
        name: data.name,
        phone: data.phone,
        email: normalizeMemberEmail(data.email),
        gender: data.gender,
        notes: data.notes || null,
        isPt,
        trainerId,
        fitnessGoal,
        ageYears,
        heightCm,
        weightKg,
        membershipPolicyAgreedText:
          policyConsent && "text" in policyConsent ? policyConsent.text : null,
        membershipPolicyAgreedAt:
          policyConsent && "agreedAt" in policyConsent
            ? policyConsent.agreedAt
            : null,
      },
    });

    const subscription = await tx.subscription.create({
      data: {
        gymId: tenantGymId,
        memberId: created.id,
        packageId: pkg.id,
        startDate,
        endDate,
        priceAtPurchase: pkg.price,
        createdById: user.id,
      },
    });

    let createdPaymentId: string | null = null;
    if (logPayment) {
      const payment = await tx.payment.create({
        data: {
          gymId: tenantGymId,
          memberId: created.id,
          subscriptionId: subscription.id,
          amount,
          method: data.method,
          paidAt: startDate,
          recordedById: user.id,
        },
      });
      await createReceiptForPayment(tx, tenantGymId, payment.id);
      createdPaymentId = payment.id;
    }

    const visitorId = data.visitorId?.trim();
    if (visitorId) {
      await tx.visitor.updateMany({
        where: {
          id: visitorId,
          gymId: tenantGymId,
          status: "pending",
        },
        data: { status: "converted" },
      });
    }

    return { member: created, paymentId: createdPaymentId };
  });

  await persistMemberPhoto(tenantGymId, member.id, formData);

  revalidatePath("/members");
  revalidatePath("/");

  if (paymentId) {
    notifyPaymentLogged(tenantGymId, paymentId).catch((err) =>
      console.error("[members] notifyPaymentLogged failed:", err),
    );
    redirect(`/members/${member.id}?receipt=${paymentId}`);
  }
  redirect(`/members/${member.id}`);
}

export async function updateMember(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireGym();

  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? "Invalid input.");
  }
  const {
    id,
    name,
    phone,
    email,
    gender,
    notes,
    isPt: isPtRaw,
    trainerId: trainerIdRaw,
    fitnessGoal,
    ageYears,
    heightCm,
    weightKg,
  } = parsed.data;

  const ptFields = await resolvePtFields(user.gymId, isPtRaw, trainerIdRaw);
  if ("ok" in ptFields) return ptFields;
  const { isPt, trainerId } = ptFields;

  const existingPhone = await withTenant(user.gymId, (tx) =>
    tx.member.findFirst({
      where: { gymId: user.gymId, phone, id: { not: id } },
      select: { id: true },
    }),
  );
  if (existingPhone) {
    return actionError("A member with this phone number already exists.");
  }

  const nextEmail = email?.trim() ? normalizeMemberEmail(email) : null;
  if (nextEmail) {
    const existingEmail = await withTenant(user.gymId, (tx) =>
      findGymMembersByEmail(tx, user.gymId, nextEmail, { excludeMemberId: id }),
    );
    if (existingEmail.length > 0) {
      return actionError(DUPLICATE_MEMBER_EMAIL_MESSAGE);
    }
  }

  const result = await withTenant(user.gymId, (tx) =>
    tx.member.updateMany({
      where: { id, gymId: user.gymId },
      data: {
        name,
        phone,
        email: nextEmail,
        gender,
        notes: notes || null,
        isPt,
        trainerId,
        fitnessGoal: prismaNull(fitnessGoal),
        ageYears: prismaNull(ageYears),
        heightCm: prismaNull(heightCm),
        weightKg: prismaNull(weightKg),
      },
    }),
  );
  if (result.count === 0) {
    return actionError("Member not found.");
  }

  await persistMemberPhoto(user.gymId, id, formData);

  revalidatePath("/members");
  revalidatePath("/members/pt");
  revalidatePath(`/members/${id}`);
  redirect(`/members/${id}`);
}

export async function deleteMember(formData: FormData): Promise<void> {
  const user = await requireGym();
  if (!canDeleteMembers(user.role)) {
    throw new Error("Forbidden: only owners can delete members.");
  }
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing member id.");

  const result = await withTenant(user.gymId, (tx) =>
    tx.member.deleteMany({ where: { id, gymId: user.gymId } }),
  );
  if (result.count === 0) {
    throw new Error("Member not found.");
  }
  revalidatePath("/members");
  revalidatePath("/members/pt");
  revalidatePath("/");
  redirect("/members");
}

const DELETE_ALL_CONFIRM = "DELETE";

/** Owner-only: remove every member in the current gym (cascades subscriptions, payments, plans). */
export async function deleteAllGymMembers(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireGym();
  if (!canDeleteMembers(user.role)) {
    return actionError("Only owners can delete all members.");
  }

  const confirm = String(formData.get("confirm") ?? "").trim();
  if (confirm !== DELETE_ALL_CONFIRM) {
    return actionError(`Type ${DELETE_ALL_CONFIRM} to confirm this action.`);
  }

  const tenantGymId = user.gymId;
  const deletedCount = await withTenant(tenantGymId, async (tx) => {
    const result = await tx.member.deleteMany({
      where: { gymId: tenantGymId },
    });
    await tx.gym.update({
      where: { id: tenantGymId },
      data: { memberSeq: 0, receiptSeq: 0 },
    });
    return result.count;
  });

  revalidatePath("/");
  revalidatePath("/members");
  revalidatePath("/members/pt");
  revalidatePath("/members/visitors");
  revalidatePath("/analytics");
  revalidatePath("/payments");
  revalidatePath("/expired");
  revalidatePath("/renewals");
  revalidatePath("/programmes/diet");
  revalidatePath("/programmes/workout");
  revalidatePath("/finance/subscriptions");
  revalidatePath("/finance/pending-dues");
  revalidatePath("/settings");

  return actionOk(
    deletedCount === 0
      ? "No members to delete. Member counters were reset."
      : `Deleted ${deletedCount} member${deletedCount === 1 ? "" : "s"} and all related subscriptions, payments, and plans for this gym.`,
  );
}

const CLEAR_EMAILS_CONFIRM = "CLEAR";

/** Owner-only: set email to null on every member in the current gym. */
export async function clearAllMemberEmails(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireGym();
  if (!canDeleteMembers(user.role)) {
    return actionError("Only owners can clear member emails.");
  }

  const confirm = String(formData.get("confirm") ?? "").trim();
  if (confirm !== CLEAR_EMAILS_CONFIRM) {
    return actionError(`Type ${CLEAR_EMAILS_CONFIRM} to confirm this action.`);
  }

  const tenantGymId = user.gymId;
  const updatedCount = await withTenant(tenantGymId, (tx) =>
    tx.member.updateMany({
      where: { gymId: tenantGymId },
      data: { email: null },
    }),
  );

  revalidatePath("/members");
  revalidatePath("/members/pt");
  revalidatePath("/settings");

  return actionOk(
    updatedCount.count === 0
      ? "No members in this gym."
      : `Cleared email on ${updatedCount.count} member${updatedCount.count === 1 ? "" : "s"} (this gym only).`,
  );
}
