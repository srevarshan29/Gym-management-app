"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/member-session";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";

const logSetSchema = z.object({
  sessionExerciseId: z.string().trim().min(1),
  setNumber: z.coerce.number().int().min(1).max(20),
  weightKg: z.coerce.number().min(0).max(500),
});

export async function startWorkoutSession(): Promise<
  ActionResult & { sessionId?: string }
> {
  const member = await requireMember();

  const plan = await prisma.workoutPlan.findFirst({
    where: { gymId: member.gymId, memberId: member.memberId },
    select: {
      id: true,
      exercises: { orderBy: { sortOrder: "asc" }, select: { id: true, sortOrder: true } },
      weeklySchedule: true,
      _count: { select: { exercises: true } },
    },
  });

  if (!plan || plan._count.exercises === 0) {
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

  const session = await prisma.workoutSession.create({
    data: {
      gymId: member.gymId,
      memberId: member.memberId,
      workoutPlanId: plan.id,
      exercises: {
        create: plan.exercises.map((row) => ({
          gymId: member.gymId,
          workoutPlanExerciseId: row.id,
          sortOrder: row.sortOrder,
        })),
      },
    },
    select: { id: true },
  });

  revalidatePath("/member/workout");
  return { ...actionOk("Workout started."), sessionId: session.id };
}

export async function logWorkoutSet(
  payload: unknown,
): Promise<ActionResult> {
  const member = await requireMember();
  const parsed = logSetSchema.safeParse(payload);
  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? "Invalid input.");
  }

  const { sessionExerciseId, setNumber, weightKg } = parsed.data;

  const sessionExercise = await prisma.workoutSessionExercise.findFirst({
    where: {
      id: sessionExerciseId,
      gymId: member.gymId,
      session: {
        memberId: member.memberId,
        status: "IN_PROGRESS",
      },
    },
    select: { id: true },
  });
  if (!sessionExercise) {
    return actionError("Workout session not found.");
  }

  await prisma.workoutSetLog.upsert({
    where: {
      sessionExerciseId_setNumber: { sessionExerciseId, setNumber },
    },
    create: {
      gymId: member.gymId,
      sessionExerciseId,
      setNumber,
      weightKg,
    },
    update: { weightKg },
  });

  revalidatePath("/member/workout");
  return actionOk("Set logged.");
}

export async function completeWorkoutSession(
  sessionId: string,
): Promise<ActionResult> {
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
}
