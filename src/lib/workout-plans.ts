import type { MuscleGroup } from "@prisma/client";

import { withTenant } from "@/lib/db-context";
import { muscleGroupLabel } from "@/lib/exercises";
import type { MemberOption } from "@/lib/programme-types";
import type {
  WorkoutPlanDayView,
  WorkoutPlanDetail,
  WorkoutPlanExerciseView,
} from "@/lib/workout-tracking/types";

export type { MemberOption };

export type WorkoutPlanListItem = {
  id: string;
  memberId: string;
  memberName: string;
  title: string;
  durationWeeks: number | null;
  focusGoal: string | null;
  exerciseCount: number;
  isLegacy: boolean;
};

export type WorkoutPlansPageData = {
  plans: WorkoutPlanListItem[];
  members: MemberOption[];
};

const exerciseSelect = {
  id: true,
  exerciseId: true,
  customName: true,
  sortOrder: true,
  targetSets: true,
  targetReps: true,
  tempo: true,
  restSeconds: true,
  targetWeightKg: true,
  exercise: { select: { name: true, muscleGroup: true } },
} as const;

function mapExerciseRow(
  row: {
    id: string;
    exerciseId: string | null;
    customName: string | null;
    sortOrder: number;
    targetSets: number;
    targetReps: string;
    tempo: string | null;
    restSeconds: number | null;
    targetWeightKg: { toString(): string } | null;
    exercise: { name: string; muscleGroup: MuscleGroup } | null;
  },
): WorkoutPlanExerciseView {
  return {
    id: row.id,
    exerciseId: row.exerciseId,
    customName: row.customName,
    displayName: row.exercise?.name ?? row.customName ?? "Exercise",
    muscleGroup: row.exercise
      ? muscleGroupLabel(row.exercise.muscleGroup)
      : null,
    sortOrder: row.sortOrder,
    targetSets: row.targetSets,
    targetReps: row.targetReps,
    tempo: row.tempo,
    restSeconds: row.restSeconds,
    targetWeightKg:
      row.targetWeightKg != null ? Number(row.targetWeightKg) : null,
  };
}

function mapDays(
  days: {
    id: string;
    label: string;
    sortOrder: number;
    exercises: Parameters<typeof mapExerciseRow>[0][];
  }[],
): WorkoutPlanDayView[] {
  return days.map((day) => ({
    id: day.id,
    label: day.label,
    sortOrder: day.sortOrder,
    exercises: [...day.exercises]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(mapExerciseRow),
  }));
}

function toPlanDetail(plan: {
  id: string;
  memberId: string;
  memberName: string;
  title: string;
  durationWeeks: number | null;
  focusGoal: string | null;
  level: WorkoutPlanDetail["level"];
  weeklySchedule: string | null;
  days: Parameters<typeof mapDays>[0];
  exerciseCount: number;
}): WorkoutPlanDetail {
  return {
    id: plan.id,
    memberId: plan.memberId,
    memberName: plan.memberName,
    title: plan.title,
    durationWeeks: plan.durationWeeks,
    focusGoal: plan.focusGoal,
    level: plan.level,
    weeklySchedule: plan.weeklySchedule,
    isLegacy: plan.exerciseCount === 0 && Boolean(plan.weeklySchedule?.trim()),
    days: mapDays(plan.days),
  };
}

export async function getWorkoutPlansPageData(
  tenantGymId: string,
): Promise<WorkoutPlansPageData> {
  return withTenant(tenantGymId, async (tx) => {
    const [plans, members] = await Promise.all([
      tx.workoutPlan.findMany({
        where: { gymId: tenantGymId },
        orderBy: [{ member: { name: "asc" } }],
        select: {
          id: true,
          memberId: true,
          title: true,
          durationWeeks: true,
          focusGoal: true,
          weeklySchedule: true,
          member: { select: { name: true } },
          _count: { select: { exercises: true } },
        },
      }),
      tx.member.findMany({
        where: { gymId: tenantGymId },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
    ]);

    return {
      plans: plans.map((plan) => ({
        id: plan.id,
        memberId: plan.memberId,
        memberName: plan.member.name,
        title: plan.title,
        durationWeeks: plan.durationWeeks,
        focusGoal: plan.focusGoal,
        exerciseCount: plan._count.exercises,
        isLegacy:
          plan._count.exercises === 0 && Boolean(plan.weeklySchedule?.trim()),
      })),
      members,
    };
  });
}

export async function getWorkoutPlanDetail(
  tenantGymId: string,
  planId: string,
): Promise<WorkoutPlanDetail | null> {
  return withTenant(tenantGymId, async (tx) => {
    const plan = await tx.workoutPlan.findFirst({
      where: { id: planId, gymId: tenantGymId },
      select: {
        id: true,
        memberId: true,
        title: true,
        durationWeeks: true,
        focusGoal: true,
        level: true,
        weeklySchedule: true,
        member: { select: { name: true } },
        days: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            label: true,
            sortOrder: true,
            exercises: {
              orderBy: { sortOrder: "asc" },
              select: exerciseSelect,
            },
          },
        },
        _count: { select: { exercises: true } },
      },
    });
    if (!plan) return null;

    return toPlanDetail({
      ...plan,
      memberName: plan.member.name,
      exerciseCount: plan._count.exercises,
    });
  });
}

export async function getMemberWorkoutPlanDetail(
  tenantGymId: string,
  memberId: string,
): Promise<WorkoutPlanDetail | null> {
  return withTenant(tenantGymId, async (tx) => {
    const plan = await tx.workoutPlan.findFirst({
      where: { gymId: tenantGymId, memberId: memberId },
      select: {
        id: true,
        memberId: true,
        title: true,
        durationWeeks: true,
        focusGoal: true,
        level: true,
        weeklySchedule: true,
        member: { select: { name: true } },
        days: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            label: true,
            sortOrder: true,
            exercises: {
              orderBy: { sortOrder: "asc" },
              select: exerciseSelect,
            },
          },
        },
        _count: { select: { exercises: true } },
      },
    });
    if (!plan) return null;

    return toPlanDetail({
      ...plan,
      memberName: plan.member.name,
      exerciseCount: plan._count.exercises,
    });
  });
}
