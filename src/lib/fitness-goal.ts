import type { FitnessGoal } from "@prisma/client";
import { z } from "zod";

export const FITNESS_GOAL_VALUES = [
  "WEIGHT_LOSS",
  "MUSCLE_GAIN",
  "GENERAL_FITNESS",
  "STRENGTH_TRAINING",
  "ENDURANCE",
] as const satisfies readonly FitnessGoal[];

export const FITNESS_GOAL_OPTIONS: { value: FitnessGoal; label: string }[] = [
  { value: "WEIGHT_LOSS", label: "Weight loss" },
  { value: "MUSCLE_GAIN", label: "Muscle gain" },
  { value: "GENERAL_FITNESS", label: "General fitness" },
  { value: "STRENGTH_TRAINING", label: "Strength training" },
  { value: "ENDURANCE", label: "Endurance" },
];

export function fitnessGoalLabel(goal: FitnessGoal | null | undefined): string {
  if (!goal) return "—";
  return (
    FITNESS_GOAL_OPTIONS.find((o) => o.value === goal)?.label ?? goal
  );
}

export const fitnessGoalSchema = z.enum(FITNESS_GOAL_VALUES, {
  required_error: "Select a fitness goal.",
  invalid_type_error: "Select a fitness goal.",
});

export const optionalFitnessGoalSchema = z
  .string()
  .optional()
  .or(z.literal(""))
  .transform((v) => (v === "" || v == null ? null : v))
  .pipe(z.enum(FITNESS_GOAL_VALUES).nullable());

const optionalIntField = (
  min: number,
  max: number,
  message: string,
) =>
  z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" || v == null ? null : Number(v)))
    .refine(
      (v) => v == null || (Number.isInteger(v) && v >= min && v <= max),
      { message },
    );

const optionalWeightField = z
  .string()
  .optional()
  .or(z.literal(""))
  .transform((v) => (v === "" || v == null ? null : Number(v)))
  .refine((v) => v == null || (v >= 20 && v <= 500), {
    message: "Enter weight in kg (20–500).",
  });

export const memberBodyMetricsFields = {
  ageYears: optionalIntField(1, 120, "Enter a valid age."),
  heightCm: optionalIntField(50, 300, "Enter height in cm (50–300)."),
  weightKg: optionalWeightField,
};

export const signupBodyMetricsSchema = z.object(memberBodyMetricsFields);
