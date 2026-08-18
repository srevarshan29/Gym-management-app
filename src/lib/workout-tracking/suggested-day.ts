import { withTenant } from "@/lib/db-context";

const WORK_SECONDS_PER_SET = 40;
const DEFAULT_REST_SECONDS = 60;

export type SuggestedWorkoutDay =
  | { kind: "none" }
  | { kind: "legacy" }
  | {
      kind: "suggested";
      dayId: string;
      label: string;
      exerciseCount: number;
      estimatedMinutes: number;
    }
  | {
      kind: "resume";
      dayId: string | null;
      label: string | null;
      exerciseCount: number;
      estimatedMinutes: number | null;
      sessionId: string;
    };

type StartableDay = {
  id: string;
  label: string;
  sortOrder: number;
  exercises: { targetSets: number; restSeconds: number | null }[];
};

export function estimateDayMinutes(
  exercises: { targetSets: number; restSeconds: number | null }[],
): number {
  if (exercises.length === 0) return 0;
  const totalSeconds = exercises.reduce((sum, exercise) => {
    const sets = Math.max(1, exercise.targetSets);
    const rest = exercise.restSeconds ?? DEFAULT_REST_SECONDS;
    return sum + sets * WORK_SECONDS_PER_SET + Math.max(0, sets - 1) * rest;
  }, 0);
  return Math.max(1, Math.round(totalSeconds / 60));
}

function nextStartableDay(
  days: StartableDay[],
  lastDayId: string | null,
): StartableDay | null {
  if (days.length === 0) return null;
  if (!lastDayId) return days[0] ?? null;
  const index = days.findIndex((day) => day.id === lastDayId);
  if (index < 0) return days[0] ?? null;
  return days[(index + 1) % days.length] ?? days[0] ?? null;
}

function inferDayId(
  workoutPlanDayId: string | null,
  exerciseDayIds: (string | null)[],
  startableIds: Set<string>,
): string | null {
  if (workoutPlanDayId && startableIds.has(workoutPlanDayId)) {
    return workoutPlanDayId;
  }
  for (const id of exerciseDayIds) {
    if (id && startableIds.has(id)) return id;
  }
  return null;
}

function toSuggested(
  day: StartableDay,
): Extract<SuggestedWorkoutDay, { kind: "suggested" }> {
  return {
    kind: "suggested",
    dayId: day.id,
    label: day.label,
    exerciseCount: day.exercises.length,
    estimatedMinutes: estimateDayMinutes(day.exercises),
  };
}

export async function getSuggestedWorkoutDay(
  tenantGymId: string,
  memberId: string,
): Promise<SuggestedWorkoutDay> {
  return withTenant(tenantGymId, async (tx) => {
    const plan = await tx.workoutPlan.findFirst({
      where: { gymId: tenantGymId, memberId },
      select: {
        weeklySchedule: true,
        days: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            label: true,
            sortOrder: true,
            exercises: {
              orderBy: { sortOrder: "asc" },
              select: { targetSets: true, restSeconds: true },
            },
          },
        },
        _count: { select: { exercises: true } },
      },
    });

    if (!plan) return { kind: "none" };

    const isLegacy =
      plan._count.exercises === 0 && Boolean(plan.weeklySchedule?.trim());
    if (isLegacy) return { kind: "legacy" };

    const startable = plan.days.filter((day) => day.exercises.length > 0);
    if (startable.length === 0) return { kind: "none" };

    const startableIds = new Set(startable.map((day) => day.id));

    const [active, lastCompleted] = await Promise.all([
      tx.workoutSession.findFirst({
        where: {
          gymId: tenantGymId,
          memberId,
          status: "IN_PROGRESS",
        },
        orderBy: { startedAt: "desc" },
        select: {
          id: true,
          workoutPlanDayId: true,
          exercises: {
            select: {
              planExercise: { select: { workoutPlanDayId: true } },
            },
          },
        },
      }),
      tx.workoutSession.findFirst({
        where: {
          gymId: tenantGymId,
          memberId,
          status: "COMPLETED",
        },
        orderBy: { completedAt: "desc" },
        select: {
          workoutPlanDayId: true,
          exercises: {
            select: {
              planExercise: { select: { workoutPlanDayId: true } },
            },
          },
        },
      }),
    ]);

    if (active) {
      const dayId = inferDayId(
        active.workoutPlanDayId,
        active.exercises.map((row) => row.planExercise.workoutPlanDayId),
        startableIds,
      );
      const day = startable.find((row) => row.id === dayId) ?? null;
      return {
        kind: "resume",
        dayId: day?.id ?? null,
        label: day?.label ?? null,
        exerciseCount: day?.exercises.length ?? active.exercises.length,
        estimatedMinutes: day ? estimateDayMinutes(day.exercises) : null,
        sessionId: active.id,
      };
    }

    const lastDayId = lastCompleted
      ? inferDayId(
          lastCompleted.workoutPlanDayId,
          lastCompleted.exercises.map((row) => row.planExercise.workoutPlanDayId),
          startableIds,
        )
      : null;

    const suggested = nextStartableDay(startable, lastDayId);
    if (!suggested) return { kind: "none" };
    return toSuggested(suggested);
  });
}
