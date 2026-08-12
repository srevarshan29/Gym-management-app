"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { withTenant } from "@/lib/db-context";
import { getGymByRegistrationToken } from "@/lib/registration";
import { getMembershipPolicyForGymPublic } from "@/lib/gym-profile";
import { isMembershipPolicyRequired } from "@/lib/membership-policy";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { prismaNull } from "@/lib/prisma-safe";
import { normalizeMemberEmail } from "@/lib/member-portal/constants";
import {
  fitnessGoalSchema,
  signupBodyMetricsSchema,
} from "@/lib/fitness-goal";

const MIN_SUBMIT_MS = 3000;
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;

const memberGenderSchema = z.enum([
  "MALE",
  "FEMALE",
  "OTHER",
  "PREFER_NOT_TO_SAY",
]);

const publicRegistrationSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120),
    phone: z.string().trim().min(3, "Phone number is required").max(30),
    email: z.string().trim().email("Enter a valid email"),
    gender: memberGenderSchema.default("PREFER_NOT_TO_SAY"),
    fitnessGoal: fitnessGoalSchema,
    website: z.string().optional(),
    formLoadedAt: z.string().optional(),
  })
  .merge(signupBodyMetricsSchema);

function todayDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export async function submitPublicRegistration(
  token: string,
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const gym = await getGymByRegistrationToken(token);
  if (!gym) {
    return actionError("This registration link is not valid.");
  }

  const parsed = publicRegistrationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? "Invalid input.");
  }

  const data = parsed.data;

  if (data.website?.trim()) {
    return actionError("Unable to submit registration.");
  }

  const loadedAt = Number(data.formLoadedAt);
  if (!loadedAt || Number.isNaN(loadedAt)) {
    return actionError("Unable to submit registration.");
  }
  if (Date.now() - loadedAt < MIN_SUBMIT_MS) {
    return actionError("Please wait a moment before submitting.");
  }

  const policyText = await getMembershipPolicyForGymPublic(gym.id);
  let policyConsent: { text: string; agreedAt: Date } | null = null;
  if (isMembershipPolicyRequired(policyText)) {
    if (formData.get("agreeMembershipPolicy") !== "1") {
      return actionError(
        "You must agree to the gym's membership policy to register.",
      );
    }
    policyConsent = { text: policyText!, agreedAt: new Date() };
  }

  const headerList = await headers();
  const ip = getClientIp(headerList.get("x-forwarded-for"));
  const rateKey = `qr-reg:${gym.id}:${ip}`;
  const rate = checkRateLimit(rateKey, RATE_LIMIT, RATE_WINDOW_MS);
  if (!rate.ok) {
    return actionError("Too many submissions. Please try again later.");
  }

  const duplicate = await withTenant(gym.id, async (tx) => {
    const existing = await tx.visitor.findFirst({
      where: {
        gymId: gym.id,
        source: "qr_registration",
        status: "pending",
        phone: data.phone,
      },
      select: { id: true },
    });
    if (existing) return true;

    await tx.visitor.create({
      data: {
        gymId: gym.id,
        name: data.name,
        phone: data.phone,
        email: normalizeMemberEmail(data.email),
        gender: data.gender,
        fitnessGoal: data.fitnessGoal,
        ageYears: prismaNull(data.ageYears),
        heightCm: prismaNull(data.heightCm),
        weightKg: prismaNull(data.weightKg),
        visitDate: todayDate(),
        notes: "Self-registered via QR",
        status: "pending",
        source: "qr_registration",
        membershipPolicyAgreedText: policyConsent?.text ?? null,
        membershipPolicyAgreedAt: policyConsent?.agreedAt ?? null,
      },
    });
    return false;
  });

  if (duplicate) {
    return actionError(
      "A registration with this phone number is already pending review.",
    );
  }

  revalidatePath("/members/register-qr");
  return actionOk("Thanks! Front desk will confirm your registration.");
}
