import type { FitnessGoal, MemberGender } from "@prisma/client";

export type BmiCategory =
  | "Underweight"
  | "Normal"
  | "Overweight"
  | "Obese";

export type BmrSex = "MALE" | "FEMALE";

export function calculateBmi(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

export function bmiCategory(bmi: number): BmiCategory {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

export function calculateProtein(weightKg: number): {
  minG: number;
  maxG: number;
  idealG: number;
} {
  return {
    minG: Math.round(weightKg * 1.6),
    maxG: Math.round(weightKg * 2.0),
    idealG: Math.round(weightKg * 1.8),
  };
}

function mifflinStJeorBmr(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  sex: BmrSex,
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return sex === "MALE" ? base + 5 : base - 161;
}

export function bmrSexFromGender(gender: MemberGender | null | undefined): BmrSex | null {
  if (gender === "MALE") return "MALE";
  if (gender === "FEMALE") return "FEMALE";
  return null;
}

export function calculateBmr(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  sex: BmrSex | "AVERAGE",
): number {
  if (sex === "AVERAGE") {
    const male = mifflinStJeorBmr(weightKg, heightCm, ageYears, "MALE");
    const female = mifflinStJeorBmr(weightKg, heightCm, ageYears, "FEMALE");
    return (male + female) / 2;
  }
  return mifflinStJeorBmr(weightKg, heightCm, ageYears, sex);
}

const LIGHTLY_ACTIVE_FACTOR = 1.375;

function goalCalorieAdjustment(goal: FitnessGoal): number {
  switch (goal) {
    case "WEIGHT_LOSS":
      return -500;
    case "MUSCLE_GAIN":
      return 300;
    default:
      return 0;
  }
}

export function calculateDailyCalories(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  goal: FitnessGoal,
  sex: BmrSex | "AVERAGE",
): number {
  const bmr = calculateBmr(weightKg, heightCm, ageYears, sex);
  const tdee = bmr * LIGHTLY_ACTIVE_FACTOR;
  return Math.round(tdee + goalCalorieAdjustment(goal));
}
