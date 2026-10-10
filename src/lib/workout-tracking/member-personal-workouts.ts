import { getRepositories } from "@/lib/firestore";
import type { MemberContext } from "@/lib/firestore/context";
import { newDocId } from "@/lib/firestore/helpers";
import type { DocWithId } from "@/lib/firestore/repositories/base";
import type { MemberPersonalWorkoutDoc } from "@/lib/firestore/types";
import {
  appendPersonalWorkoutExercise,
  personalWorkoutToPlanDoc,
  reorderPersonalWorkoutExercises,
  removePersonalWorkoutExercise,
} from "@/lib/workout-tracking/member-personal-workout-plan";

export type MemberPersonalWorkoutSummary = {
  id: string;
  name: string;
  exerciseCount: number;
  updatedAt: string;
};

export type MemberPersonalWorkoutDetail = {
  id: string;
  name: string;
  exercises: {
    id: string;
    catalogId: string;
    sortOrder: number;
    targetSets: number;
    targetReps: string;
    displayName: string;
    muscleGroup: string | null;
  }[];
};

function toSummary(doc: DocWithId<MemberPersonalWorkoutDoc>): MemberPersonalWorkoutSummary {
  const updatedAt =
    doc.updatedAt?.toDate?.() ?? doc.createdAt?.toDate?.() ?? new Date(0);
  return {
    id: doc.id,
    name: doc.name,
    exerciseCount: Array.isArray(doc.exercises) ? doc.exercises.length : 0,
    updatedAt: updatedAt.toISOString(),
  };
}

export async function listMemberPersonalWorkouts(
  ctx: MemberContext,
): Promise<MemberPersonalWorkoutSummary[]> {
  const { memberPersonalWorkouts } = getRepositories();
  const rows = await memberPersonalWorkouts.listForMember(
    ctx,
    ctx.gymId,
    ctx.memberId,
  );
  return rows.map(toSummary);
}

export async function getMemberPersonalWorkoutDetail(
  ctx: MemberContext,
  workoutId: string,
): Promise<MemberPersonalWorkoutDetail | null> {
  const { memberPersonalWorkouts, exerciseCatalog } = getRepositories();
  const doc = await memberPersonalWorkouts.getForMember(
    ctx,
    ctx.gymId,
    ctx.memberId,
    workoutId,
  );
  if (!doc) return null;

  const catalogIds = [...new Set(doc.exercises.map((e) => e.catalogId))];
  const catalogMap = await exerciseCatalog.getByCatalogIds(ctx, catalogIds);

  const exercises = [...doc.exercises]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((row) => {
      const catalog = catalogMap.get(row.catalogId);
      return {
        id: row.id,
        catalogId: row.catalogId,
        sortOrder: row.sortOrder,
        targetSets: row.targetSets,
        targetReps: row.targetReps,
        displayName: catalog?.name ?? "Exercise",
        muscleGroup: catalog?.muscleGroup ?? null,
      };
    });

  return { id: doc.id, name: doc.name, exercises };
}

export async function createMemberPersonalWorkout(
  ctx: MemberContext,
  name: string,
): Promise<string> {
  const { memberPersonalWorkouts } = getRepositories();
  const id = newDocId();
  await memberPersonalWorkouts.createForMember(ctx, ctx.gymId, ctx.memberId, id, {
    name,
    exercises: [],
  });
  return id;
}

export async function saveMemberPersonalWorkout(
  ctx: MemberContext,
  workoutId: string,
  payload: {
    name: string;
    exercises: {
      id: string;
      catalogId: string;
      sortOrder: number;
      targetSets: number;
      targetReps: string;
    }[];
  },
): Promise<void> {
  const { memberPersonalWorkouts } = getRepositories();
  await memberPersonalWorkouts.updateForMember(
    ctx,
    ctx.gymId,
    ctx.memberId,
    workoutId,
    {
      name: payload.name,
      exercises: payload.exercises.map((row) => ({
        id: row.id,
        catalogId: row.catalogId,
        sortOrder: row.sortOrder,
        targetSets: row.targetSets,
        targetReps: row.targetReps,
      })),
    },
  );
}

export async function deleteMemberPersonalWorkout(
  ctx: MemberContext,
  workoutId: string,
): Promise<void> {
  const { memberPersonalWorkouts } = getRepositories();
  await memberPersonalWorkouts.deleteForMember(
    ctx,
    ctx.gymId,
    ctx.memberId,
    workoutId,
  );
}

export async function addCatalogExerciseToPersonalWorkout(
  ctx: MemberContext,
  workoutId: string,
  catalogId: string,
): Promise<void> {
  const { memberPersonalWorkouts, exerciseCatalog } = getRepositories();
  const doc = await memberPersonalWorkouts.getForMember(
    ctx,
    ctx.gymId,
    ctx.memberId,
    workoutId,
  );
  if (!doc) throw new Error("Workout not found.");

  const catalog = await exerciseCatalog.getByCatalogId(ctx, catalogId);
  if (!catalog?.isActive) throw new Error("Exercise not found.");

  const exercises = appendPersonalWorkoutExercise(doc.exercises, catalogId);
  await memberPersonalWorkouts.updateForMember(
    ctx,
    ctx.gymId,
    ctx.memberId,
    workoutId,
    { name: doc.name, exercises },
  );
}

export { personalWorkoutToPlanDoc, reorderPersonalWorkoutExercises, removePersonalWorkoutExercise };
