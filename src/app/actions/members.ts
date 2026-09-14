"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import {
  createMemberWithSubscription,
  getRepositories,
  platformContext,
} from "@/lib/firestore";
import { staffContextFromUser } from "@/lib/firestore/session-context";
import type { GymSessionUser } from "@/lib/session";
import {
  fitnessGoalSchema,
  optionalFitnessGoalSchema,
  signupBodyMetricsSchema,
} from "@/lib/fitness-goal";
import { getMembershipPolicyForGym } from "@/lib/gym-profile";
import { isMembershipPolicyRequired } from "@/lib/membership-policy";
import { normalizeMemberEmail } from "@/lib/member-portal/constants";
import {
  DUPLICATE_MEMBER_EMAIL_MESSAGE,
  findGymMembersByEmailFirestore,
} from "@/lib/member-portal/email";
import { notifyPaymentLogged } from "@/lib/notifications";
import { canDeleteMembers, canLogPayments } from "@/lib/permissions";
import { requireGym } from "@/lib/session";
import { uploadMemberPhoto } from "@/lib/storage";
import { validateTrainerForGym } from "@/lib/staff";
import { convertVisitorRecord } from "@/lib/firestore/visitor-operations";
import { deleteDietPlanForMember } from "@/lib/firestore/diet-plan-operations";
import { deleteWorkoutPlanForMember } from "@/lib/firestore/workout-plan-operations";
import {
  adjustPtMemberCounter,
  ptMemberCounterDelta,
} from "@/lib/firestore/pt-member-counter";

const memberGenderSchema = z.enum([
  "MALE",
  "FEMALE",
  "OTHER",
  "PREFER_NOT_TO_SAY",
]);

const createSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120),
    phone: z.string().trim().min(3, "Phone number is required").max(30),
    email: z.string().trim().email("Enter a valid email"),
    gender: memberGenderSchema.default("PREFER_NOT_TO_SAY"),
    notes: z.string().trim().max(1000).optional().or(z.literal("")),
    packageId: z.string().trim().min(1, "Select a package"),
    startDate: z.string().optional(),
    logPayment: z.enum(["0", "1"]).default("0"),
    amount: z.string().optional(),
    method: z
      .enum(["CASH", "UPI", "CARD", "BANK_TRANSFER", "OTHER"])
      .default("CASH"),
    isPt: z.enum(["0", "1"]).default("0"),
    trainerId: z.string().optional().or(z.literal("")),
    visitorId: z.string().optional().or(z.literal("")),
    fitnessGoal: fitnessGoalSchema,
  })
  .merge(signupBodyMetricsSchema);

const updateSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().trim().min(1, "Name is required").max(120),
    phone: z.string().trim().min(3, "Phone number is required").max(30),
    email: z
      .string()
      .trim()
      .email("Enter a valid email")
      .optional()
      .or(z.literal("")),
    gender: memberGenderSchema.default("PREFER_NOT_TO_SAY"),
    notes: z.string().trim().max(1000).optional().or(z.literal("")),
    isPt: z.enum(["0", "1"]).default("0"),
    trainerId: z.string().optional().or(z.literal("")),
    fitnessGoal: optionalFitnessGoalSchema,
  })
  .merge(signupBodyMetricsSchema);

async function resolvePtFields(
  gymId: string,
  isPtRaw: "0" | "1",
  trainerIdRaw: string | undefined,
): Promise<{ isPt: boolean; trainerId: string | null } | ActionResult> {
  const isPt = isPtRaw === "1";
  if (!isPt) return { isPt: false, trainerId: null };
  const trainerId =
    trainerIdRaw && trainerIdRaw.trim() !== "" ? trainerIdRaw.trim() : null;
  if (trainerId) {
    const valid = await validateTrainerForGym(gymId, trainerId);
    if (!valid) return actionError("Selected trainer is not valid for this gym.");
  }
  return { isPt: true, trainerId };
}

async function persistMemberPhoto(
  user: GymSessionUser,
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
  const ctx = staffContextFromUser(user);
  const { members } = getRepositories();
  await members.updatePhotoUrl(ctx, user.gymId, memberId, result.url);
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
  const ctx = staffContextFromUser(user);
  const { members, packages } = getRepositories();

  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? "Invalid input.");
  }
  const data = parsed.data;

  if (await members.findByPhone(ctx, tenantGymId, data.phone)) {
    return actionError("A member with this phone number already exists.");
  }

  const existingEmail = await findGymMembersByEmailFirestore(
    tenantGymId,
    data.email,
  );
  if (existingEmail.length > 0) {
    return actionError(DUPLICATE_MEMBER_EMAIL_MESSAGE);
  }

  const pkg = await packages.findById(ctx, tenantGymId, data.packageId);
  if (!pkg) return actionError("Selected package no longer exists.");

  const startDate = data.startDate ? new Date(data.startDate) : new Date();
  if (Number.isNaN(startDate.getTime())) {
    return actionError("Invalid start date.");
  }
  const { computeEndDate } = await import("@/lib/subscription");
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
    const { visitors } = getRepositories();
    const visitor = await visitors.getById(
      platformContext,
      tenantGymId,
      visitorId,
    );
    if (visitor && visitor.status === "pending") {
      visitorMetrics = {
        fitnessGoal: visitor.fitnessGoal,
        ageYears: visitor.ageYears,
        heightCm: visitor.heightCm,
        weightKg: visitor.weightKg,
      };
    }
  }

  const { memberId, paymentId } = await createMemberWithSubscription({
    gymId: tenantGymId,
    name: data.name,
    phone: data.phone,
    email: normalizeMemberEmail(data.email),
    gender: data.gender,
    notes: data.notes || null,
    isPt,
    trainerId,
    fitnessGoal: data.fitnessGoal ?? visitorMetrics?.fitnessGoal ?? null,
    ageYears: data.ageYears ?? visitorMetrics?.ageYears ?? null,
    heightCm: data.heightCm ?? visitorMetrics?.heightCm ?? null,
    weightKg:
      data.weightKg ??
      (visitorMetrics?.weightKg != null ? visitorMetrics.weightKg : null),
    membershipPolicyAgreedText:
      policyConsent && "text" in policyConsent ? policyConsent.text : null,
    membershipPolicyAgreedAt:
      policyConsent && "agreedAt" in policyConsent ? policyConsent.agreedAt : null,
    packageId: pkg.id,
    packageName: pkg.name,
    packagePrice: pkg.price,
    startDate,
    endDate,
    createdById: user.id,
    createdByName: user.name ?? user.email ?? "Staff",
    logPayment,
    paymentAmount: logPayment ? amount : undefined,
    paymentMethod: data.method,
  });

  if (visitorId) {
    await convertVisitorRecord(tenantGymId, visitorId).catch((err) =>
      console.warn("[members] visitor convert failed:", err),
    );
  }

  await persistMemberPhoto(user, memberId, formData);

  revalidatePath("/members");
  revalidatePath("/members/visitors");
  revalidatePath("/members/register-qr");
  revalidatePath("/");

  if (paymentId) {
    notifyPaymentLogged(tenantGymId, paymentId).catch((err) =>
      console.error("[members] notifyPaymentLogged failed:", err),
    );
    redirect(`/members/${memberId}?receipt=${paymentId}`);
  }
  redirect(`/members/${memberId}`);
}

export async function updateMember(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireGym();
  const ctx = staffContextFromUser(user);
  const { members } = getRepositories();

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

  const phoneTaken = await members.findByPhone(ctx, user.gymId, phone, id);
  if (phoneTaken) {
    return actionError("A member with this phone number already exists.");
  }

  const nextEmail = email?.trim() ? normalizeMemberEmail(email) : null;
  if (nextEmail) {
    const existingEmail = await findGymMembersByEmailFirestore(
      user.gymId,
      nextEmail,
      { excludeMemberId: id },
    );
    if (existingEmail.length > 0) {
      return actionError(DUPLICATE_MEMBER_EMAIL_MESSAGE);
    }
  }

  const existing = await members.findByIdAndGym(ctx, user.gymId, id);
  if (!existing) return actionError("Member not found.");

  const updated = await members.update(ctx, user.gymId, id, {
    name,
    phone,
    email: nextEmail,
    gender,
    notes: notes || null,
    isPt,
    trainerId,
    fitnessGoal: fitnessGoal ?? null,
    ageYears: ageYears ?? null,
    heightCm: heightCm ?? null,
    weightKg: weightKg ?? null,
  });
  if (!updated) return actionError("Member not found.");

  await adjustPtMemberCounter(
    user.gymId,
    ptMemberCounterDelta(existing.isPt, isPt),
  );

  await persistMemberPhoto(user, id, formData);

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

  const ctx = staffContextFromUser(user);
  const { members } = getRepositories();
  const existing = await members.findByIdAndGym(ctx, user.gymId, id);
  if (!existing) throw new Error("Member not found.");

  if (existing.isPt) {
    await adjustPtMemberCounter(user.gymId, -1);
  }
  await deleteDietPlanForMember(user.gymId, id).catch((err) =>
    console.warn("[members] diet plan cleanup failed:", err),
  );
  await deleteWorkoutPlanForMember(user.gymId, id).catch((err) =>
    console.warn("[members] workout plan cleanup failed:", err),
  );

  const deleted = await members.delete(ctx, user.gymId, id);
  if (!deleted) throw new Error("Member not found.");

  revalidatePath("/members");
  revalidatePath("/members/pt");
  revalidatePath("/");
  redirect("/members");
}
