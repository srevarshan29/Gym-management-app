"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/member-session";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import type { ExerciseTrackingType } from "@prisma/client";

const logSetSchema = z.object({
  sessionExerciseId: z.string().trim().min(1),
  setNumber: z.coerce.number().int().min(1).max(20),
  weightKg: z.coerce.number().min(0).max(500).optional(),
  durationSeconds: z.coerce.number().int().min(1).max(3600).optional(),
});

function actionErrorFromUnknown(error: unknown, fallback: string): ActionResult {
  console.error(fallback, error);
  if (error instanceof Error && error.message) {
    return actionError(error.message);
  }
  return actionError(fallback);
}

function resolveTrackingType(planExercise: {
  trackingTypeOverride: ExerciseTrackingType | null;
  exercise: { trackingType: ExerciseTrackingType } | null;
}): ExerciseTrackingType {
  return (
    planExercise.trackingTypeOverride ??
    planExercise.exercise?.trackingType ??
    "WEIGHTED"
  );
}

export async function startWorkoutSession(
  workoutPlanDayId?: string | null,
): Promise<ActionResult & { sessionId?: string }> {
  try {
    const member = await requireMember();

    const plan = await prisma.workoutPlan.findFirst({
      where: { gymId: member.gymId, memberId: member.memberId },
      select: {
        id: true,
        days: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            exercises: {
              orderBy: { sortOrder: "asc" },
              select: { id: true, sortOrder: true },
            },
          },
        },
      },
    });

    const daysWithExercises = (plan?.days ?? []).filter(
      (day) => day.exercises.length > 0,
    );
    if (!plan || daysWithExercises.length === 0) {
      return actionError("No structured workout plan assigned yet.");
    }

    const existing = await prisma.workoutSession.findFirst({
      where: {
        gymId: member.gymId,
        memberId: member.memberId,
        status: "IN_PROGRESS",
      },
      select: { id: true },
    });
    if (existing) {
      return { ...actionOk("Resuming your workout."), sessionId: existing.id };
    }

    const requestedDayId = workoutPlanDayId?.trim() || "";
    let day = daysWithExercises.find((row) => row.id === requestedDayId);
    if (!day && daysWithExercises.length === 1) {
      day = daysWithExercises[0];
    }
    if (!day && daysWithExercises.length > 1 && !requestedDayId) {
      return actionError("Select which day to train.");
    }
    if (!day) {
      return actionError("That training day is not on your plan.");
    }

    const session = await prisma.workoutSession.create({
      data: {
        gymId: member.gymId,
        memberId: member.memberId,
        workoutPlanId: plan.id,
        workoutPlanDayId: day.id,
        exercises: {
          create: day.exercises.map((row) => ({
            gymId: member.gymId,
            workoutPlanExerciseId: row.id,
            sortOrder: row.sortOrder,
          })),
        },
      },
      select: { id: true },
    });

    revalidatePath("/member/workout");
    revalidatePath("/member");
    return { ...actionOk("Workout started."), sessionId: session.id };
  } catch (error) {
    return actionErrorFromUnknown(
      error,
      "Could not start workout. Please try again.",
    );
  }
}

function buildSetLogData(
  trackingType: ExerciseTrackingType,
  weightKg: number | undefined,
  durationSeconds: number | undefined,
): { weightKg: number | null; durationSeconds: number | null } {
  switch (trackingType) {
    case "WEIGHTED":
      return { weightKg: weightKg ?? null, durationSeconds: null };
    case "TIME":
      return { weightKg: null, durationSeconds: durationSeconds ?? null };
    default:
      return { weightKg: null, durationSeconds: null };
  }
}

export async function logWorkoutSet(
  payload: unknown,
): Promise<ActionResult> {
  try {
    const member = await requireMember();
    const parsed = logSetSchema.safeParse(payload);
    if (!parsed.success) {
      return actionError(parsed.error.errors[0]?.message ?? "Invalid input.");
    }

    const { sessionExerciseId, setNumber, weightKg, durationSeconds } =
      parsed.data;

    const sessionExercise = await prisma.workoutSessionExercise.findFirst({
      where: {
        id: sessionExerciseId,
        gymId: member.gymId,
        session: {
          memberId: member.memberId,
          status: "IN_PROGRESS",
        },
      },
      select: {
        id: true,
        planExercise: {
          select: {
            trackingTypeOverride: true,
            exercise: { select: { trackingType: true } },
          },
        },
      },
    });
    if (!sessionExercise) {
      return actionError("Workout session not found.");
    }

    const trackingType = resolveTrackingType(sessionExercise.planExercise);

    if (trackingType === "WEIGHTED") {
      if (weightKg == null) {
        return actionError("Enter a weight for this set.");
      }
    } else if (trackingType === "TIME") {
      if (durationSeconds == null) {
        return actionError("Enter a duration in seconds for this set.");
      }
    }

    const setValues = buildSetLogData(trackingType, weightKg, durationSeconds);

    await prisma.workoutSetLog.upsert({
      where: {
        sessionExerciseId_setNumber: { sessionExerciseId, setNumber },
      },
      create: {
        gymId: member.gymId,
        sessionExerciseId,
        setNumber,
        ...setValues,
      },
      update: setValues,
    });

    revalidatePath("/member/workout");
    return actionOk("Set logged.");
  } catch (error) {
    return actionErrorFromUnknown(
      error,
      "Could not log set. Please try again.",
    );
  }
}

export async function completeWorkoutSession(
  sessionId: string,
): Promise<ActionResult> {
  try {
    const member = await requireMember();

    const session = await prisma.workoutSession.findFirst({
      where: {
        id: sessionId,
        gymId: member.gymId,
        memberId: member.memberId,
        status: "IN_PROGRESS",
      },
      select: { id: true, startedAt: true },
    });
    if (!session) {
      return actionError("Active workout session not found.");
    }

    const completedAt = new Date();
    const durationSeconds = Math.max(
      0,
      Math.round((completedAt.getTime() - session.startedAt.getTime()) / 1000),
    );

    await prisma.workoutSession.update({
      where: { id: session.id },
      data: {
        status: "COMPLETED",
        completedAt,
        durationSeconds,
      },
    });

    revalidatePath("/member/workout");
    return actionOk("Workout completed. Great job!");
  } catch (error) {
    return actionErrorFromUnknown(
      error,
      "Could not complete workout. Please try again.",
    );
  }
}
