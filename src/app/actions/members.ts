"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { withPlatformLookup, withTenant } from "@/lib/db-context";
import { requireGym } from "@/lib/session";
import { canDeleteMembers, canLogPayments } from "@/lib/permissions";
import { computeEndDate } from "@/lib/subscription";
import { createReceiptForPayment } from "@/lib/receipts";
import { nextMemberNumber } from "@/lib/gym-sequence";
import { notifyPaymentLogged } from "@/lib/notifications";
import { uploadMemberPhoto } from "@/lib/storage";
import { validateTrainerForGym } from "@/lib/staff";
import { actionError, type ActionResult } from "@/lib/action-result";

const memberGenderSchema = z.enum([
  "MALE",
  "FEMALE",
  "OTHER",
  "PREFER_NOT_TO_SAY",
]);

const createSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  phone: z.string().trim().min(3, "Phone number is required").max(30),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
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
});

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "Name is required").max(120),
  phone: z.string().trim().min(3, "Phone number is required").max(30),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  gender: memberGenderSchema.default("PREFER_NOT_TO_SAY"),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  isPt: z.enum(["0", "1"]).default("0"),
  trainerId: z.string().optional().or(z.literal("")),
});

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
  gymId: string,
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

  await withTenant(gymId, (tx) =>
    tx.member.updateMany({
      where: { id: memberId, gymId },
      data: { photoUrl: result.url },
    }),
  );
  return result.url;
}

export async function createMember(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireGym();
  const gymId = user.gymId;

  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? "Invalid input.");
  }
  const data = parsed.data;

  const pkg = await withTenant(gymId, (tx) =>
    tx.package.findFirst({ where: { id: data.packageId, gymId } }),
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

  const { member, paymentId } = await withTenant(gymId, async (tx) => {
    const memberNumber = await nextMemberNumber(tx, gymId);

    const created = await tx.member.create({
      data: {
        gymId,
        memberNumber,
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        gender: data.gender,
        notes: data.notes || null,
        isPt,
        trainerId,
      },
    });

    const subscription = await tx.subscription.create({
      data: {
        gymId,
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
          gymId,
          memberId: created.id,
          subscriptionId: subscription.id,
          amount,
          method: data.method,
          paidAt: startDate,
          recordedById: user.id,
        },
      });
      await createReceiptForPayment(tx, gymId, payment.id);
      createdPaymentId = payment.id;
    }

    const visitorId = data.visitorId?.trim();
    if (visitorId) {
      await tx.visitor.updateMany({
        where: { id: visitorId, gymId, status: "pending" },
        data: { status: "converted" },
      });
    }

    return { member: created, paymentId: createdPaymentId };
  });

  await persistMemberPhoto(gymId, member.id, formData);

  revalidatePath("/members");
  revalidatePath("/members/pt");
  revalidatePath("/members/visitors");
  revalidatePath("/members/register-qr");
  revalidatePath("/analytics");
  revalidatePath("/");

  if (paymentId) {
    notifyPaymentLogged(gymId, paymentId).catch((err) =>
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
  const { id, name, phone, email, gender, notes, isPt: isPtRaw, trainerId: trainerIdRaw } =
    parsed.data;

  const ptFields = await resolvePtFields(user.gymId, isPtRaw, trainerIdRaw);
  if ("ok" in ptFields) return ptFields;
  const { isPt, trainerId } = ptFields;

  const result = await withTenant(user.gymId, (tx) =>
    tx.member.updateMany({
      where: { id, gymId: user.gymId },
      data: {
        name,
        phone,
        email: email || null,
        gender,
        notes: notes || null,
        isPt,
        trainerId,
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
