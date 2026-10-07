"use server";

import { z } from "zod";

import {
  addMemberNutritionLogEntry,
  removeMemberNutritionLogEntry,
} from "@/lib/firestore/nutrition-log-operations";
import type { MemberContext } from "@/lib/firestore/context";
import { isNutritionMealType } from "@/lib/nutrition/meal-types";
import {
  loadMemberNutritionDay,
  parseNutritionLogDate,
  searchNutritionFoodCatalog,
  type MemberNutritionDayView,
  type NutritionFoodSearchResult,
} from "@/lib/nutrition/member-day";
import { requireMember } from "@/lib/member-session";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";

function memberContextFromSession(member: {
  gymId: string;
  memberId: string;
}): MemberContext {
  return {
    kind: "member",
    gymId: member.gymId,
    memberId: member.memberId,
  };
}

function actionErrorFromUnknown(error: unknown, fallback: string): ActionResult {
  console.error(fallback, error);
  if (error instanceof Error && error.message) {
    return actionError(error.message);
  }
  return actionError(fallback);
}

const searchSchema = z.object({
  query: z.string().trim().min(3).max(80),
});

const addSchema = z.object({
  logDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  mealType: z.string().trim(),
  foodId: z.string().trim().min(1).max(128),
  quantityGrams: z.coerce.number().min(0.1).max(10_000),
});

const removeSchema = z.object({
  logDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  logId: z.string().trim().min(1).max(128),
});

export async function searchMemberNutritionFoods(
  payload: unknown,
): Promise<ActionResult<NutritionFoodSearchResult[]>> {
  try {
    const member = await requireMember();
    void member;
    const parsed = searchSchema.safeParse(payload);
    if (!parsed.success) {
      return actionError("Enter at least 3 characters to search.");
    }
    const results = await searchNutritionFoodCatalog(parsed.data.query);
    return actionOk(undefined, results);
  } catch (error) {
    return actionErrorFromUnknown(error, "Could not search foods.");
  }
}

export async function addMemberNutritionLog(
  payload: unknown,
): Promise<ActionResult<MemberNutritionDayView>> {
  try {
    const member = await requireMember();
    const parsed = addSchema.safeParse(payload);
    if (!parsed.success) {
      return actionError("Invalid food log entry.");
    }
    if (!isNutritionMealType(parsed.data.mealType)) {
      return actionError("Invalid meal type.");
    }

    const day = await addMemberNutritionLogEntry(
      memberContextFromSession(member),
      {
        logDate: parseNutritionLogDate(parsed.data.logDate),
        mealType: parsed.data.mealType,
        foodId: parsed.data.foodId,
        quantityGrams: parsed.data.quantityGrams,
      },
    );
    return actionOk(undefined, day);
  } catch (error) {
    return actionErrorFromUnknown(error, "Could not add food.");
  }
}

export async function removeMemberNutritionLog(
  payload: unknown,
): Promise<ActionResult<MemberNutritionDayView>> {
  try {
    const member = await requireMember();
    const parsed = removeSchema.safeParse(payload);
    if (!parsed.success) {
      return actionError("Invalid log entry.");
    }

    const day = await removeMemberNutritionLogEntry(
      memberContextFromSession(member),
      {
        logDate: parseNutritionLogDate(parsed.data.logDate),
        logId: parsed.data.logId,
      },
    );
    return actionOk(undefined, day);
  } catch (error) {
    return actionErrorFromUnknown(error, "Could not remove food.");
  }
}

export async function getMemberNutritionDay(
  logDate: string,
): Promise<ActionResult<MemberNutritionDayView>> {
  try {
    const member = await requireMember();
    const day = await loadMemberNutritionDay(
      memberContextFromSession(member),
      parseNutritionLogDate(logDate),
    );
    return actionOk(undefined, day);
  } catch (error) {
    return actionErrorFromUnknown(error, "Could not load nutrition log.");
  }
}
