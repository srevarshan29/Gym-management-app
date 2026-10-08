"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import type { MemberContext } from "@/lib/firestore/context";
import { startPersonalWorkoutSessionRecord } from "@/lib/firestore/workout-session-operations";
import { requireMember } from "@/lib/member-session";
import {
  addCatalogExerciseToPersonalWorkout,
  createMemberPersonalWorkout,
  deleteMemberPersonalWorkout,
  getMemberPersonalWorkoutDetail,
  listMemberPersonalWorkouts,
  saveMemberPersonalWorkout,
  type MemberPersonalWorkoutDetail,
  type MemberPersonalWorkoutSummary,
} from "@/lib/workout-tracking/member-personal-workouts";

const nameSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

const exerciseRowSchema = z.object({
  id: z.string().trim().min(1).max(80),
  catalogId: z.string().trim().min(1).max(128),
  sortOrder: z.coerce.number().int().min(0).max(200),
  targetSets: z.coerce.number().int().min(1).max(20),
  targetReps: z.string().trim().min(1).max(40),
});

const saveSchema = z.object({
  workoutId: z.string().trim().min(1),
  name: z.string().trim().min(1).max(80),
  exercises: z.array(exerciseRowSchema).max(40),
});

function memberCtx(member: {
  gymId: string;
  memberId: string;
}): MemberContext {
  return { kind: "member", gymId: member.gymId, memberId: member.memberId };
}

function revalidateMemberWorkout() {
  revalidatePath("/member/workout");
}

export async function listMemberPersonalWorkoutsAction(): Promise<
  ActionResult<MemberPersonalWorkoutSummary[]>
> {
  try {
    const member = await requireMember();
    const rows = await listMemberPersonalWorkouts(memberCtx(member));
    return actionOk(undefined, rows);
  } catch (error) {
    console.error("[personal-workout] list failed", error);
    return actionError("Could not load your workouts.");
  }
}

export async function getMemberPersonalWorkoutAction(
  workoutId: string,
): Promise<ActionResult<MemberPersonalWorkoutDetail>> {
  try {
    const member = await requireMember();
    const detail = await getMemberPersonalWorkoutDetail(
      memberCtx(member),
      workoutId,
    );
    if (!detail) return actionError("Workout not found.");
    return actionOk(undefined, detail);
  } catch (error) {
    console.error("[personal-workout] get failed", error);
    return actionError("Could not load workout.");
  }
}

export async function createMemberPersonalWorkoutAction(
  payload: unknown,
): Promise<ActionResult<{ workoutId: string }>> {
  try {
    const member = await requireMember();
    const parsed = nameSchema.safeParse(payload);
    if (!parsed.success) {
      return actionError("Enter a workout name.");
    }
    const workoutId = await createMemberPersonalWorkout(
      memberCtx(member),
      parsed.data.name,
    );
    revalidateMemberWorkout();
    return actionOk("Workout created.", { workoutId });
  } catch (error) {
    console.error("[personal-workout] create failed", error);
    return actionError("Could not create workout.");
  }
}

export async function saveMemberPersonalWorkoutAction(
  payload: unknown,
): Promise<ActionResult> {
  try {
    const member = await requireMember();
    const parsed = saveSchema.safeParse(payload);
    if (!parsed.success) {
      return actionError("Invalid workout data.");
    }
    await saveMemberPersonalWorkout(memberCtx(member), parsed.data.workoutId, {
      name: parsed.data.name,
      exercises: parsed.data.exercises,
    });
    revalidateMemberWorkout();
    return actionOk("Workout saved.");
  } catch (error) {
    console.error("[personal-workout] save failed", error);
    return actionError("Could not save workout.");
  }
}

export async function deleteMemberPersonalWorkoutAction(
  workoutId: string,
): Promise<ActionResult> {
  try {
    const member = await requireMember();
    await deleteMemberPersonalWorkout(memberCtx(member), workoutId);
    revalidateMemberWorkout();
    return actionOk("Workout deleted.");
  } catch (error) {
    console.error("[personal-workout] delete failed", error);
    return actionError("Could not delete workout.");
  }
}

export async function addExerciseToPersonalWorkoutAction(payload: {
  workoutId: string;
  catalogId: string;
}): Promise<ActionResult> {
  try {
    const member = await requireMember();
    await addCatalogExerciseToPersonalWorkout(
      memberCtx(member),
      payload.workoutId.trim(),
      payload.catalogId.trim(),
    );
    revalidateMemberWorkout();
    return actionOk("Exercise added.");
  } catch (error) {
    console.error("[personal-workout] add exercise failed", error);
    return actionError(
      error instanceof Error ? error.message : "Could not add exercise.",
    );
  }
}

export async function startPersonalWorkoutSessionAction(
  personalWorkoutId: string,
): Promise<ActionResult & { sessionId?: string }> {
  try {
    const member = await requireMember();
    const result = await startPersonalWorkoutSessionRecord(
      memberCtx(member),
      personalWorkoutId.trim(),
    );
    revalidateMemberWorkout();
    return {
      ...actionOk(
        result.resumed ? "Resuming your workout." : "Workout started.",
      ),
      sessionId: result.sessionId,
    };
  } catch (error) {
    console.error("[personal-workout] start session failed", error);
    return actionError(
      error instanceof Error ? error.message : "Could not start workout.",
    );
  }
}
