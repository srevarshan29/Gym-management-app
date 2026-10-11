"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  completeWorkoutSessionRecord,
  logWorkoutSetRecord,
  startWorkoutSessionRecord,
} from "@/lib/firestore/workout-session-operations";
import type { MemberContext } from "@/lib/firestore/context";
import { measureServerPhase } from "@/lib/server-perf";
import { requireMember } from "@/lib/member-session";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { loadPreviousSetsForActiveMemberSession } from "@/lib/workout-tracking/member-active-session-previous-sets";
import type {
  ActiveWorkoutSetLog,
  PreviousSetsBySessionExerciseId,
} from "@/lib/workout-tracking/types";

const logSetSchema = z.object({
  sessionExerciseId: z.string().trim().min(1),
  setNumber: z.coerce.number().int().min(1).max(20),
  weightKg: z.coerce.number().min(0).max(500).optional(),
  durationSeconds: z.coerce.number().int().min(1).max(3600).optional(),
});

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

function revalidateWorkoutSessionPaths() {
  revalidatePath("/member/workout");
  revalidatePath("/member");
}

export async function loadActiveWorkoutPreviousSetsAction(
  sessionId: string,
): Promise<ActionResult<PreviousSetsBySessionExerciseId>> {
  try {
    const member = await requireMember();
    const data = await measureServerPhase(
      "member.workout.previousSets",
      () =>
        loadPreviousSetsForActiveMemberSession(
          memberContextFromSession(member),
          sessionId,
        ),
    );
    if (!data) {
      return actionError("Workout session not found.");
    }
    return actionOk(undefined, data);
  } catch (error) {
    console.error("[workout] load previous sets failed", error);
    return actionError("Could not load previous sets.");
  }
}

export async function startWorkoutSession(
  workoutPlanDayId?: string | null,
): Promise<ActionResult & { sessionId?: string }> {
  try {
    const member = await requireMember();
    const result = await measureServerPhase("member.workout.start", () =>
      startWorkoutSessionRecord(
        memberContextFromSession(member),
        workoutPlanDayId,
      ),
    );

    revalidateWorkoutSessionPaths();
    return {
      ...actionOk(
        result.resumed ? "Resuming your workout." : "Workout started.",
      ),
      sessionId: result.sessionId,
    };
  } catch (error) {
    return actionErrorFromUnknown(
      error,
      "Could not start workout. Please try again.",
    );
  }
}

export async function logWorkoutSet(
  payload: unknown,
): Promise<
  ActionResult<{
    sessionExerciseId: string;
    set: ActiveWorkoutSetLog;
  }>
> {
  return measureServerPhase("member.workout.logSet.action", async () => {
    try {
      const member = await measureServerPhase(
        "member.workout.logSet.auth",
        () => requireMember(),
      );
      const parsed = logSetSchema.safeParse(payload);
      if (!parsed.success) {
        return actionError(parsed.error.errors[0]?.message ?? "Invalid input.");
      }

      const result = await logWorkoutSetRecord(
        memberContextFromSession(member),
        parsed.data,
      );

      return actionOk("Set logged.", result);
    } catch (error) {
      return actionErrorFromUnknown(
        error,
        "Could not log set. Please try again.",
      );
    }
  });
}

export async function completeWorkoutSession(
  sessionId: string,
): Promise<ActionResult> {
  try {
    const member = await requireMember();
    await completeWorkoutSessionRecord(
      memberContextFromSession(member),
      sessionId,
    );

    revalidateWorkoutSessionPaths();
    return actionOk("Workout completed. Great job!");
  } catch (error) {
    return actionErrorFromUnknown(
      error,
      "Could not complete workout. Please try again.",
    );
  }
}
