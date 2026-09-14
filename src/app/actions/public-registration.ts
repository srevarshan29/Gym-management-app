"use server";



import { revalidatePath } from "next/cache";

import { headers } from "next/headers";

import { z } from "zod";



import { getGymByRegistrationToken } from "@/lib/registration";

import { getMembershipPolicyForGymPublic } from "@/lib/gym-profile";

import { isMembershipPolicyRequired } from "@/lib/membership-policy";

import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";

import { normalizeMemberEmail } from "@/lib/member-portal/constants";

import {

  fitnessGoalSchema,

  signupBodyMetricsSchema,

} from "@/lib/fitness-goal";

import { createQrRegistrationVisitor } from "@/lib/firestore/visitor-operations";



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



  let result: Awaited<ReturnType<typeof createQrRegistrationVisitor>>;

  try {

    result = await createQrRegistrationVisitor(gym.id, {

      name: data.name,

      phone: data.phone,

      email: normalizeMemberEmail(data.email),

      gender: data.gender,

      fitnessGoal: data.fitnessGoal,

      ageYears: data.ageYears ?? null,

      heightCm: data.heightCm ?? null,

      weightKg: data.weightKg ?? null,

      visitDate: todayDate(),

      notes: "Self-registered via QR",

      membershipPolicyAgreedText: policyConsent?.text ?? null,

      membershipPolicyAgreedAt: policyConsent?.agreedAt ?? null,

    });

  } catch (error) {

    console.error("[public-registration] Firestore unavailable:", error);

    return actionError(

      "Registration is temporarily unavailable. Please try again shortly or visit the front desk.",

    );

  }



  if (result.duplicate) {

    return actionError(

      "A registration with this phone number is already pending review.",

    );

  }



  revalidatePath("/members/register-qr");

  return actionOk("Thanks! Front desk will confirm your registration.");

}

