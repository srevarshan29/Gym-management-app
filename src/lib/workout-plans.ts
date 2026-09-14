import { getRepositories, platformContext } from "@/lib/firestore";
import { WORKOUT_PLANS_PAGE_SIZE } from "@/lib/firestore/repositories/workout-plans";
import type {
  MuscleGroup,
  WorkoutPlanDoc,
  WorkoutPlanExerciseEmbedded,
} from "@/lib/firestore/types";
import type { WorkoutPlanListItem, MemberOption } from "@/lib/programme-types";
import { muscleGroupLabel } from "@/lib/muscle-groups";
import type {
  WorkoutPlanDayView,
  WorkoutPlanDetail,
  WorkoutPlanExerciseView,
} from "@/lib/workout-tracking/types";

export type { MemberOption, WorkoutPlanListItem } from "@/lib/programme-types";

export type WorkoutPlansPageData = {
  plans: WorkoutPlanListItem[];
  members: MemberOption[];
  assignedMemberIds: string[];
  total: number;
  page: number;
  pageSize: number;
};

type ExerciseLookup = Map<
  string,
  { name: string; muscleGroup: MuscleGroup }
>;

function countPlanExercises(plan: Pick<WorkoutPlanDoc, "days">): number {
  return (plan.days ?? []).reduce(
    (sum, day) => sum + day.exercises.length,
    0,
  );
}

function isLegacyPlan(
  exerciseCount: number,
  weeklySchedule: string | null | undefined,
): boolean {
  return exerciseCount === 0 && Boolean(weeklySchedule?.trim());
}

async function loadExerciseLookup(gymId: string): Promise<ExerciseLookup> {
  const { customExercises } = getRepositories();
  const rows = await customExercises.listLibrary(platformContext, gymId);
  return new Map(
    rows.map((row) => [
      row.id,
      { name: row.name, muscleGroup: row.muscleGroup },
    ]),
  );
}

function mapExerciseRow(
  row: WorkoutPlanExerciseEmbedded,
  lookup: ExerciseLookup,
): WorkoutPlanExerciseView {
  const exercise = row.exerciseId ? lookup.get(row.exerciseId) : null;
  return {
    id: row.id,
    exerciseId: row.exerciseId,
    customName: row.customName,
    displayName: exercise?.name ?? row.customName ?? "Exercise",
    muscleGroup: exercise ? muscleGroupLabel(exercise.muscleGroup) : null,
    sortOrder: row.sortOrder,
    targetSets: row.targetSets,
    targetReps: row.targetReps,
    tempo: row.tempo,
    restSeconds: row.restSeconds,
    targetWeightKg: row.targetWeightKg,
  };
}

function mapDays(
  days: WorkoutPlanDoc["days"],
  lookup: ExerciseLookup,
): WorkoutPlanDayView[] {
  return [...(days ?? [])]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((day) => ({
      id: day.id,
      label: day.label,
      sortOrder: day.sortOrder,
      exercises: [...day.exercises]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((row) => mapExerciseRow(row, lookup)),
    }));
}

function toPlanDetail(
  plan: {
    id: string;
    memberId: string;
    memberName: string;
    title: string;
    durationWeeks: number | null;
    focusGoal: string | null;
    level: WorkoutPlanDetail["level"];
    weeklySchedule: string | null;
    days: WorkoutPlanDoc["days"];
  },
  lookup: ExerciseLookup,
): WorkoutPlanDetail {
  const exerciseCount = countPlanExercises(plan);
  return {
    id: plan.id,
    memberId: plan.memberId,
    memberName: plan.memberName,
    title: plan.title,
    durationWeeks: plan.durationWeeks,
    focusGoal: plan.focusGoal,
    level: plan.level,
    weeklySchedule: plan.weeklySchedule,
    isLegacy: isLegacyPlan(exerciseCount, plan.weeklySchedule),
    days: mapDays(plan.days, lookup),
  };
}

function toListItem(doc: {
  id: string;
  memberId: string;
  memberName: string;
  title: string;
  durationWeeks: number | null;
  focusGoal: string | null;
  weeklySchedule: string | null;
  days: WorkoutPlanDoc["days"];
}): WorkoutPlanListItem {
  const exerciseCount = countPlanExercises(doc);
  return {
    id: doc.id,
    memberId: doc.memberId,
    memberName: doc.memberName,
    title: doc.title,
    durationWeeks: doc.durationWeeks,
    focusGoal: doc.focusGoal,
    exerciseCount,
    isLegacy: isLegacyPlan(exerciseCount, doc.weeklySchedule),
  };
}

export async function getWorkoutPlansPageData(
  tenantGymId: string,
  page = 1,
): Promise<WorkoutPlansPageData> {
  const { workoutPlans, members } = getRepositories();

  const [planPage, memberOptions, allPlans] = await Promise.all([
    workoutPlans.listWorkoutPlanPage(platformContext, tenantGymId, {
      page,
      pageSize: WORKOUT_PLANS_PAGE_SIZE,
    }),
    members.listMemberOptions(platformContext, tenantGymId),
    workoutPlans.listAllForExport(platformContext, tenantGymId),
  ]);

  return {
    plans: planPage.items.map(toListItem),
    members: memberOptions,
    assignedMemberIds: allPlans.map((plan) => plan.memberId),
    total: planPage.total,
    page: planPage.page,
    pageSize: planPage.pageSize,
  };
}

/** Full list for CSV export (cursor-paged, capped at 1000 rows). */
export async function getAllWorkoutPlansForExport(
  tenantGymId: string,
): Promise<WorkoutPlanListItem[]> {
  const { workoutPlans } = getRepositories();
  const rows = await workoutPlans.listAllForExport(
    platformContext,
    tenantGymId,
  );
  return rows.map(toListItem);
}

export async function getWorkoutPlanDetail(
  tenantGymId: string,
  planId: string,
): Promise<WorkoutPlanDetail | null> {
  const { workoutPlans } = getRepositories();
  const [plan, lookup] = await Promise.all([
    workoutPlans.getById(platformContext, tenantGymId, planId),
    loadExerciseLookup(tenantGymId),
  ]);
  if (!plan) return null;
  return toPlanDetail(plan, lookup);
}

export async function getMemberWorkoutPlanDetail(
  tenantGymId: string,
  memberId: string,
): Promise<WorkoutPlanDetail | null> {
  const { workoutPlans } = getRepositories();
  const [plan, lookup] = await Promise.all([
    workoutPlans.findByMemberId(platformContext, tenantGymId, memberId),
    loadExerciseLookup(tenantGymId),
  ]);
  if (!plan) return null;
  return toPlanDetail(plan, lookup);
}
