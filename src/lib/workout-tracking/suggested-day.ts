import { getRepositories } from "@/lib/firestore";
import type { MemberContext } from "@/lib/firestore/context";
import type { WorkoutPlanDoc } from "@/lib/firestore/types";
import {
  findDayIdForPlanExercise,
  isLegacyWorkoutPlan,
} from "@/lib/workout-tracking/session-plan";
import type { SuggestedWorkoutDay } from "@/lib/workout-tracking/types";

export type { SuggestedWorkoutDay } from "@/lib/workout-tracking/types";

const WORK_SECONDS_PER_SET = 40;
const DEFAULT_REST_SECONDS = 60;

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
  exercisePlanIds: string[],
  plan: WorkoutPlanDoc,
  startableIds: Set<string>,
): string | null {
  if (workoutPlanDayId && startableIds.has(workoutPlanDayId)) {
    return workoutPlanDayId;
  }
  for (const planExerciseId of exercisePlanIds) {
    const dayId = findDayIdForPlanExercise(plan, planExerciseId);
    if (dayId && startableIds.has(dayId)) return dayId;
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

function memberContext(gymId: string, memberId: string): MemberContext {
  return { kind: "member", gymId, memberId };
}

export async function getSuggestedWorkoutDay(
  tenantGymId: string,
  memberId: string,
): Promise<SuggestedWorkoutDay> {
  const ctx = memberContext(tenantGymId, memberId);
  const { workoutPlans, workoutSessions } = getRepositories();

  const plan = await workoutPlans.findByMemberId(ctx, tenantGymId, memberId);
  if (!plan) return { kind: "none" };
  if (isLegacyWorkoutPlan(plan)) return { kind: "legacy" };

  const startable = [...(plan.days ?? [])]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter((day) => day.exercises.length > 0)
    .map((day) => ({
      id: day.id,
      label: day.label,
      sortOrder: day.sortOrder,
      exercises: day.exercises.map((exercise) => ({
        targetSets: exercise.targetSets,
        restSeconds: exercise.restSeconds,
      })),
    }));

  if (startable.length === 0) return { kind: "none" };

  const startableIds = new Set(startable.map((day) => day.id));

  const [active, lastCompleted] = await Promise.all([
    workoutSessions.findActiveSession(ctx, tenantGymId, memberId),
    workoutSessions.findLastCompletedSession(ctx, tenantGymId, memberId),
  ]);

  if (active) {
    const dayId = inferDayId(
      active.workoutPlanDayId,
      active.exercises.map((row) => row.workoutPlanExerciseId),
      plan,
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
        lastCompleted.exercises.map((row) => row.workoutPlanExerciseId),
        plan,
        startableIds,
      )
    : null;

  const suggested = nextStartableDay(startable, lastDayId);
  if (!suggested) return { kind: "none" };
  return toSuggested(suggested);
}
