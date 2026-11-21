"use server";

import { z } from "zod";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import type { MemberContext } from "@/lib/firestore/context";
import { CHEST_MUSCLE_REGIONS } from "@/lib/member-portal/chest-muscle-regions";
import type { MemberLibraryMuscleFilter } from "@/lib/member-portal/member-library-muscle-groups";
import { isMemberLibraryRegionId } from "@/lib/member-portal/muscle-region-registry";
import { MUSCLE_GROUP_VALUES } from "@/lib/muscle-groups";
import { requireMember } from "@/lib/member-session";
import {
  browseMemberExerciseCatalog,
  getMemberCatalogExerciseDetail,
  MemberLibraryRegionPaginationError,
  type MemberCatalogBrowsePage,
  type MemberCatalogExerciseDetail,
} from "@/lib/workout-tracking/member-catalog-exercises";

const browseSchema = z
  .object({
    query: z.string().trim().max(80).optional(),
    muscleGroup: z.enum(MUSCLE_GROUP_VALUES).optional().nullable(),
    fullBody: z.boolean().optional(),
    cardio: z.boolean().optional(),
    chestRegion: z.enum(CHEST_MUSCLE_REGIONS).optional().nullable(),
    libraryRegion: z.string().trim().max(40).optional().nullable(),
    // Region browse uses encoded cursors (mbr1:…) larger than catalog doc ids.
    startAfterId: z.string().trim().max(24576).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const flags = [
      data.muscleGroup != null,
      data.fullBody === true,
      data.cardio === true,
    ].filter(Boolean).length;
    if (flags > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Conflicting browse filters.",
      });
    }
    const libraryRegion =
      data.libraryRegion ?? data.chestRegion ?? null;
    const libraryGroup = data.muscleGroup as
      | MemberLibraryMuscleFilter
      | null
      | undefined;
    if (
      libraryRegion &&
      libraryGroup &&
      !isMemberLibraryRegionId(libraryGroup, libraryRegion)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid library region.",
      });
    }
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
    const libraryRegion =
      parsed.data.libraryRegion ?? parsed.data.chestRegion ?? null;
    const libraryGroup = parsed.data.muscleGroup as
      | MemberLibraryMuscleFilter
      | null
      | undefined;
    const page = await browseMemberExerciseCatalog(memberCtx(member), {
      query: parsed.data.query,
      muscleGroup: parsed.data.muscleGroup ?? null,
      fullBody: parsed.data.fullBody,
      cardio: parsed.data.cardio,
      chestRegion: parsed.data.chestRegion ?? null,
      libraryRegion,
      libraryGroup: libraryGroup ?? null,
      startAfterId: parsed.data.startAfterId ?? null,
    });
    return actionOk(undefined, page);
  } catch (error) {
    if (error instanceof MemberLibraryRegionPaginationError) {
      return actionError(error.message);
    }
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
