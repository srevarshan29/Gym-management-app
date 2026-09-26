import { getRepositories, platformContext } from "@/lib/firestore";
import { WORKOUT_PLANS_PAGE_SIZE } from "@/lib/firestore/repositories/workout-plans";
import type {
  WorkoutPlanDoc,
  WorkoutPlanExerciseEmbedded,
} from "@/lib/firestore/types";
import type { MuscleGroup } from "@/lib/muscle-groups";
import type { WorkoutPlanListItem, MemberOption } from "@/lib/programme-types";
import { muscleGroupLabel } from "@/lib/muscle-groups";
import { getExercisesByIds } from "@/lib/workout-tracking/exercise-library";
import { collectLibraryExerciseIdsFromPlan } from "@/lib/workout-tracking/session-plan";
import type {
  WorkoutPlanDayView,
  WorkoutPlanDetail,
  WorkoutPlanExerciseView,
} from "@/lib/workout-tracking/types";
import type { ExerciseListItem } from "@/lib/workout-tracking/types";
import { EMPTY_MEMBER_EXERCISE_MEDIA } from "@/lib/workout-tracking/member-exercise-media";

export type { MemberOption, WorkoutPlanListItem } from "@/lib/programme-types";

export type WorkoutPlansPageData = {
  plans: WorkoutPlanListItem[];
  members: MemberOption[];
  assignedMemberIds: string[];
  total: number;
  page: number;
  pageSize: number;
};

type ExerciseLookup = Map<string, ExerciseListItem>;

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

async function loadExerciseLookup(
  gymId: string,
  plan: Pick<WorkoutPlanDoc, "days">,
): Promise<ExerciseLookup> {
  const exerciseIds = collectLibraryExerciseIdsFromPlan(plan);
  const items = await getExercisesByIds(gymId, exerciseIds);
  return new Map(items.map((item) => [item.id, item]));
}

function mapExerciseRow(
  row: WorkoutPlanExerciseEmbedded,
  lookup: ExerciseLookup,
): WorkoutPlanExerciseView {
  const exercise = row.exerciseId ? lookup.get(row.exerciseId) : null;
  const mediaEntry = exercise
    ? { media: exercise.media, hasMedia: exercise.hasMedia }
    : EMPTY_MEMBER_EXERCISE_MEDIA;

  return {
    id: row.id,
    exerciseId: row.exerciseId,
    customName: row.customName,
    displayName: exercise?.name ?? row.customName ?? "Exercise",
    muscleGroup: exercise
      ? muscleGroupLabel(exercise.muscleGroup as MuscleGroup)
      : null,
    sortOrder: row.sortOrder,
    targetSets: row.targetSets,
    targetReps: row.targetReps,
    tempo: row.tempo,
    restSeconds: row.restSeconds,
    targetWeightKg: row.targetWeightKg,
    media: mediaEntry.media,
    hasMedia: mediaEntry.hasMedia,
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

  const [planPage, memberOptions, assignedMemberIds] = await Promise.all([
    workoutPlans.listWorkoutPlanPage(platformContext, tenantGymId, {
      page,
      pageSize: WORKOUT_PLANS_PAGE_SIZE,
    }),
    members.listMemberOptions(platformContext, tenantGymId),
    workoutPlans.listAssignedMemberIds(platformContext, tenantGymId),
  ]);

  return {
    plans: planPage.items.map(toListItem),
    members: memberOptions,
    assignedMemberIds,
    total: planPage.total,
    page: planPage.page,
    pageSize: planPage.pageSize,
  };
}

export async function getWorkoutPlanNewPageData(
  tenantGymId: string,
): Promise<Pick<WorkoutPlansPageData, "members" | "assignedMemberIds">> {
  const { workoutPlans, members } = getRepositories();

  const [memberOptions, assignedMemberIds] = await Promise.all([
    members.listMemberOptions(platformContext, tenantGymId),
    workoutPlans.listAssignedMemberIds(platformContext, tenantGymId),
  ]);

  return {
    members: memberOptions,
    assignedMemberIds,
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
  const plan = await workoutPlans.getById(platformContext, tenantGymId, planId);
  if (!plan) return null;
  const lookup = await loadExerciseLookup(tenantGymId, plan);
  return toPlanDetail(plan, lookup);
}

export async function getMemberWorkoutPlanDetail(
  tenantGymId: string,
  memberId: string,
): Promise<WorkoutPlanDetail | null> {
  const { workoutPlans } = getRepositories();
  const plan = await workoutPlans.findByMemberId(
    platformContext,
    tenantGymId,
    memberId,
  );
  if (!plan) return null;
  const lookup = await loadExerciseLookup(tenantGymId, plan);
  return toPlanDetail(plan, lookup);
}

/** Builds a member plan view from an already-loaded plan and exercise lookup. */
export function buildMemberWorkoutPlanDetail(
  plan: WorkoutPlanDoc & { id: string },
  lookup: ExerciseLookup,
): WorkoutPlanDetail {
  return toPlanDetail(plan, lookup);
}

export async function buildMemberWorkoutPlanDetailWithLookup(
  tenantGymId: string,
  plan: WorkoutPlanDoc & { id: string },
  prefetchedLookup?: ExerciseLookup,
): Promise<WorkoutPlanDetail> {
  const lookup =
    prefetchedLookup ?? (await loadExerciseLookup(tenantGymId, plan));
  return toPlanDetail(plan, lookup);
}
