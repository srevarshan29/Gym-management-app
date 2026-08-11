import { prisma } from "@/lib/prisma";
import type { ExerciseTrackingType } from "@prisma/client";

export type ProgressGrouping = "weekly" | "monthly";

export type ExerciseProgressPoint = {
  label: string;
  maxWeightKg: number | null;
  maxDurationSeconds: number | null;
  sessionDate: Date;
};

export type ExerciseProgressData = {
  exerciseName: string;
  trackingType: ExerciseTrackingType;
  targetWeightKg: number | null;
  points: ExerciseProgressPoint[];
};

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
      trackingTypeOverride: true,
      exercise: { select: { name: true, trackingType: true } },
      customName: true,
    },
  });

  const exerciseName =
    planExercise?.exercise?.name ?? planExercise?.customName ?? customName ?? "Exercise";
  const trackingType = planExercise
    ? resolveTrackingType(planExercise)
    : "WEIGHTED";

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
      durationSeconds: true,
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
      trackingType,
      targetWeightKg:
        planExercise?.targetWeightKg != null
          ? Number(planExercise.targetWeightKg)
          : null,
      points: [],
    };
  }

  const sessionMax = new Map<
    string,
    { date: Date; maxWeightKg: number | null; maxDurationSeconds: number | null }
  >();

  for (const log of setLogs) {
    const sessionId = log.sessionExercise.workoutSessionId;
    const session = log.sessionExercise.session;
    const date = session.completedAt ?? session.startedAt;
    const weight =
      log.weightKg != null ? Number(log.weightKg) : null;
    const duration = log.durationSeconds;
    const existing = sessionMax.get(sessionId);

    if (trackingType === "TIME") {
      if (duration == null) continue;
      if (!existing || duration > (existing.maxDurationSeconds ?? 0)) {
        sessionMax.set(sessionId, {
          date,
          maxWeightKg: null,
          maxDurationSeconds: duration,
        });
      }
      continue;
    }

    if (weight == null) continue;
    if (!existing || weight > (existing.maxWeightKg ?? 0)) {
      sessionMax.set(sessionId, {
        date,
        maxWeightKg: weight,
        maxDurationSeconds: null,
      });
    }
  }

  const bucketed = new Map<
    string,
    { date: Date; maxWeightKg: number | null; maxDurationSeconds: number | null }
  >();
  for (const entry of sessionMax.values()) {
    const key = bucketKey(entry.date, grouping);
    const current = bucketed.get(key);
    const entryValue =
      trackingType === "TIME"
        ? entry.maxDurationSeconds ?? 0
        : entry.maxWeightKg ?? 0;
    const currentValue =
      trackingType === "TIME"
        ? current?.maxDurationSeconds ?? 0
        : current?.maxWeightKg ?? 0;
    if (!current || entryValue > currentValue) {
      bucketed.set(key, entry);
    }
  }

  const points = [...bucketed.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({
      label: bucketLabel(key, grouping),
      maxWeightKg: value.maxWeightKg,
      maxDurationSeconds: value.maxDurationSeconds,
      sessionDate: value.date,
    }));

  return {
    exerciseName,
    trackingType,
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
