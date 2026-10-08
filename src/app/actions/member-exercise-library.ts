"use server";

import { z } from "zod";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import type { MemberContext } from "@/lib/firestore/context";
import { MUSCLE_GROUP_VALUES } from "@/lib/muscle-groups";
import { requireMember } from "@/lib/member-session";
import {
  browseMemberExerciseCatalog,
  getMemberCatalogExerciseDetail,
  type MemberCatalogBrowsePage,
  type MemberCatalogExerciseDetail,
} from "@/lib/workout-tracking/member-catalog-exercises";

const browseSchema = z.object({
  query: z.string().trim().max(80).optional(),
  muscleGroup: z.enum(MUSCLE_GROUP_VALUES).optional().nullable(),
  startAfterId: z.string().trim().max(128).optional().nullable(),
});

const detailSchema = z.object({
  catalogId: z.string().trim().min(1).max(128),
});

function memberCtx(member: {
  gymId: string;
  memberId: string;
}): MemberContext {
  return { kind: "member", gymId: member.gymId, memberId: member.memberId };
}

export async function browseMemberExerciseLibraryAction(
  payload: unknown,
): Promise<ActionResult<MemberCatalogBrowsePage>> {
  try {
    const member = await requireMember();
    const parsed = browseSchema.safeParse(payload);
    if (!parsed.success) {
      return actionError("Invalid search.");
    }
    const page = await browseMemberExerciseCatalog(memberCtx(member), {
      query: parsed.data.query,
      muscleGroup: parsed.data.muscleGroup ?? null,
      startAfterId: parsed.data.startAfterId ?? null,
    });
    return actionOk(undefined, page);
  } catch (error) {
    console.error("[member-library] browse failed", error);
    return actionError("Could not load exercises.");
  }
}

export async function getMemberExerciseLibraryDetailAction(
  payload: unknown,
): Promise<ActionResult<MemberCatalogExerciseDetail>> {
  try {
    const member = await requireMember();
    const parsed = detailSchema.safeParse(payload);
    if (!parsed.success) {
      return actionError("Invalid exercise.");
    }
    const detail = await getMemberCatalogExerciseDetail(
      memberCtx(member),
      member.gymId,
      parsed.data.catalogId,
    );
    if (!detail) {
      return actionError("Exercise not found.");
    }
    return actionOk(undefined, detail);
  } catch (error) {
    console.error("[member-library] detail failed", error);
    return actionError("Could not load exercise.");
  }
}
