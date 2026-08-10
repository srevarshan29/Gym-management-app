import { prisma } from "@/lib/prisma";

export type ProgressGrouping = "weekly" | "monthly";

export type ExerciseProgressPoint = {
  label: string;
  maxWeightKg: number;
  sessionDate: Date;
};

export type ExerciseProgressData = {
  exerciseName: string;
  targetWeightKg: number | null;
  points: ExerciseProgressPoint[];
};

function bucketKey(date: Date, grouping: ProgressGrouping): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  if (grouping === "monthly") {
    return `${year}-${String(month).padStart(2, "0")}`;
  }
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
}

function bucketLabel(key: string, grouping: ProgressGrouping): string {
  if (grouping === "monthly") {
    const [year, month] = key.split("-");
    return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString(
      undefined,
      { month: "short", year: "2-digit" },
    );
  }
  const [year, month, day] = key.split("-");
  return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString(
    undefined,
    { month: "short", day: "numeric" },
  );
}

export async function getExerciseProgressData(
  gymId: string,
  memberId: string,
  exerciseKey: string,
  grouping: ProgressGrouping = "weekly",
): Promise<ExerciseProgressData | null> {
  const isCustom = exerciseKey.startsWith("custom:");
  const exerciseId = isCustom ? null : exerciseKey;
  const customName = isCustom ? exerciseKey.slice("custom:".length) : null;

  const planExercise = await prisma.workoutPlanExercise.findFirst({
    where: {
      gymId,
      workoutPlan: { memberId },
      ...(exerciseId ? { exerciseId } : { customName }),
    },
    select: {
      targetWeightKg: true,
      exercise: { select: { name: true } },
      customName: true,
    },
  });

  const exerciseName =
    planExercise?.exercise?.name ?? planExercise?.customName ?? customName ?? "Exercise";

  const setLogs = await prisma.workoutSetLog.findMany({
    where: {
      gymId,
      sessionExercise: {
        session: {
          memberId,
          gymId,
          status: "COMPLETED",
        },
        planExercise: exerciseId
          ? { exerciseId }
          : { customName: customName ?? undefined },
      },
    },
    select: {
      weightKg: true,
      sessionExercise: {
        select: {
          workoutSessionId: true,
          session: { select: { completedAt: true, startedAt: true } },
        },
      },
    },
    orderBy: { loggedAt: "asc" },
  });

  if (setLogs.length === 0) {
    return {
      exerciseName,
      targetWeightKg:
        planExercise?.targetWeightKg != null
          ? Number(planExercise.targetWeightKg)
          : null,
      points: [],
    };
  }

  const sessionMax = new Map<string, { date: Date; max: number }>();

  for (const log of setLogs) {
    const sessionId = log.sessionExercise.workoutSessionId;
    const session = log.sessionExercise.session;
    const date = session.completedAt ?? session.startedAt;
    const weight = Number(log.weightKg);
    const existing = sessionMax.get(sessionId);
    if (!existing || weight > existing.max) {
      sessionMax.set(sessionId, { date, max: weight });
    }
  }

  const bucketed = new Map<string, { date: Date; max: number }>();
  for (const entry of sessionMax.values()) {
    const key = bucketKey(entry.date, grouping);
    const current = bucketed.get(key);
    if (!current || entry.max > current.max) {
      bucketed.set(key, { date: entry.date, max: entry.max });
    }
  }

  const points = [...bucketed.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({
      label: bucketLabel(key, grouping),
      maxWeightKg: value.max,
      sessionDate: value.date,
    }));

  return {
    exerciseName,
    targetWeightKg:
      planExercise?.targetWeightKg != null
        ? Number(planExercise.targetWeightKg)
        : null,
    points,
  };
}

export async function getMemberExerciseOptions(
  gymId: string,
  memberId: string,
): Promise<{ key: string; label: string }[]> {
  const plan = await prisma.workoutPlan.findFirst({
    where: { gymId, memberId },
    select: {
      exercises: {
        orderBy: { sortOrder: "asc" },
        select: {
          exerciseId: true,
          customName: true,
          exercise: { select: { name: true } },
        },
      },
    },
  });
  if (!plan) return [];

  return plan.exercises.map((row) => {
    if (row.exerciseId) {
      return {
        key: row.exerciseId,
        label: row.exercise?.name ?? "Exercise",
      };
    }
    const name = row.customName ?? "Custom exercise";
    return { key: `custom:${name}`, label: name };
  });
}
