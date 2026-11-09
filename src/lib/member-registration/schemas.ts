import { z } from "zod";

import {
  fitnessGoalSchema,
  optionalFitnessGoalSchema,
  requiredSignupBodyMetricsSchema,
  signupBodyMetricsSchema,
} from "@/lib/fitness-goal";

export const memberGenderSchema = z.enum([
  "MALE",
  "FEMALE",
  "OTHER",
  "PREFER_NOT_TO_SAY",
]);

const requiredMemberGenderSchema = memberGenderSchema;

export const staffCreateMemberSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120),
    phone: z.string().trim().min(3, "Phone number is required").max(30),
    email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
    gender: requiredMemberGenderSchema,
    notes: z.string().trim().max(1000).optional().or(z.literal("")),
    packageId: z.string().trim().min(1, "Select a package"),
    agreedMembershipPrice: z.string().trim().min(1, "Enter the agreed membership price."),
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
  .merge(requiredSignupBodyMetricsSchema);

export const staffUpdateMemberSchema = z
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

export const publicQrRegistrationSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120),
    phone: z.string().trim().min(3, "Phone number is required").max(30),
    email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
    gender: requiredMemberGenderSchema,
    fitnessGoal: fitnessGoalSchema,
    website: z.string().optional(),
    formLoadedAt: z.string().optional(),
  })
  .merge(requiredSignupBodyMetricsSchema);
