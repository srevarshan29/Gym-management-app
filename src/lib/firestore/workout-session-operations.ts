import { getFirestoreDb } from "@/lib/firebase/admin";
import { getRepositories } from "@/lib/firestore";
import type { MemberContext } from "@/lib/firestore/context";
import { newDocId } from "@/lib/firestore/helpers";
import type { ExerciseTrackingType } from "@/lib/firestore/types";
import {
  resolveSessionExerciseContext,
} from "@/lib/workout-tracking/session-exercise-identity";
import { buildPlanExerciseMap, resolvePlanExerciseTrackingType } from "@/lib/workout-tracking/session-plan";
import { getExerciseLibraryMapByIds } from "@/lib/workout-tracking/exercise-library";
import type { ActiveWorkoutSetLog } from "@/lib/workout-tracking/types";

async function loadExerciseLibraryMapForTracking(
  gymId: string,
  exerciseId: string | null | undefined,
) {
  const id = exerciseId?.trim();
  if (!id) return new Map();
  return getExerciseLibraryMapByIds(gymId, [id]);
}
function buildSetLogValues(
  trackingType: ExerciseTrackingType,
  weightKg: number | undefined,
  durationSeconds: number | undefined,
): { weightKg: number | null; durationSeconds: number | null } {
  switch (trackingType) {
    case "WEIGHTED":
      return { weightKg: weightKg ?? null, durationSeconds: null };
    case "TIME":
      return { weightKg: null, durationSeconds: durationSeconds ?? null };
    case "BODYWEIGHT":
      return { weightKg: weightKg ?? null, durationSeconds: null };
    default:
      return { weightKg: null, durationSeconds: null };
  }
}

export async function startWorkoutSessionRecord(
  ctx: MemberContext,
  workoutPlanDayId?: string | null,
): Promise<{ sessionId: string; resumed: boolean }> {
  const { workoutPlans, workoutSessions } = getRepositories();
  const gymId = ctx.gymId;
  const memberId = ctx.memberId;

  const [plan, existing] = await Promise.all([
    workoutPlans.findByMemberId(ctx, gymId, memberId),
    workoutSessions.findActiveSession(ctx, gymId, memberId),
  ]);
  const daysWithExercises = (plan?.days ?? []).filter(
    (day) => day.exercises.length > 0,
  );
  if (!plan || daysWithExercises.length === 0) {
    throw new Error("No structured workout plan assigned yet.");
  }

  if (existing) {
    return { sessionId: existing.id, resumed: true };
  }

  const requestedDayId = workoutPlanDayId?.trim() || "";
  let day = daysWithExercises.find((row) => row.id === requestedDayId);
  if (!day && daysWithExercises.length === 1) {
    day = daysWithExercises[0];
  }
  if (!day && daysWithExercises.length > 1 && !requestedDayId) {
    throw new Error("Select which day to train.");
  }
  if (!day) {
    throw new Error("That training day is not on your plan.");
  }

  const sessionId = newDocId();
  const { sessionId: resolvedId, created } =
    await workoutSessions.createSessionIfNoActive(ctx, gymId, sessionId, {
      memberId,
      workoutPlanId: plan.id,
      workoutPlanDayId: day.id,
      exercises: day.exercises.map((row) => ({
        id: newDocId(),
        workoutPlanExerciseId: row.id,
        sortOrder: row.sortOrder,
        exerciseId: row.exerciseId,
        customName: row.customName,
        trackingTypeOverride: row.trackingTypeOverride,
        targetReps: row.targetReps,
        sets: [],
      })),
    });

  return { sessionId: resolvedId, resumed: !created };
}

export type LogWorkoutSetResult = {
  sessionExerciseId: string;
  set: ActiveWorkoutSetLog;
};

export async function logWorkoutSetRecord(
  ctx: MemberContext,
  input: {
    sessionExerciseId: string;
    setNumber: number;
    weightKg?: number;
    durationSeconds?: number;
  },
): Promise<LogWorkoutSetResult> {
  const { workoutPlans, workoutSessions } = getRepositories();
  const gymId = ctx.gymId;
  const memberId = ctx.memberId;

  const active = await workoutSessions.findActiveSession(ctx, gymId, memberId);
  if (!active) {
    throw new Error("Workout session not found.");
  }

  const sessionExercise = active.exercises.find(
    (row) => row.id === input.sessionExerciseId,
  );
  if (!sessionExercise) {
    throw new Error("Workout session not found.");
  }

  const plan = await workoutPlans.getById(ctx, gymId, active.workoutPlanId);
  if (!plan) {
    throw new Error("Workout session not found.");
  }

  const planExerciseMap = buildPlanExerciseMap(plan);
  const exerciseContext = resolveSessionExerciseContext(
    sessionExercise,
    planExerciseMap,
  );
  if (!exerciseContext) {
    throw new Error("Workout session not found.");
  }

  let trackingType: ExerciseTrackingType;
  if (exerciseContext.trackingTypeOverride) {
    trackingType = exerciseContext.trackingTypeOverride;
  } else if (exerciseContext.exerciseId) {
    const library = await loadExerciseLibraryMapForTracking(
      gymId,
      exerciseContext.exerciseId,
    );
    trackingType = resolvePlanExerciseTrackingType(exerciseContext, library);
  } else {
    trackingType = "WEIGHTED";
  }

  if (trackingType === "WEIGHTED" && input.weightKg == null) {
    throw new Error("Enter a weight for this set.");
  }
  if (trackingType === "TIME" && input.durationSeconds == null) {
    throw new Error("Enter a duration in seconds for this set.");
  }

  const setValues = buildSetLogValues(
    trackingType,
    input.weightKg,
    input.durationSeconds,
  );

  const db = getFirestoreDb();
  await db.runTransaction(async (tx) => {
    await workoutSessions.upsertSetLogInTransaction(
      tx,
      ctx,
      gymId,
      active.id,
      input.sessionExerciseId,
      input.setNumber,
      setValues,
    );
  });

  return {
    sessionExerciseId: input.sessionExerciseId,
    set: {
      setNumber: input.setNumber,
      weightKg: setValues.weightKg,
      durationSeconds: setValues.durationSeconds,
    },
  };
}

export async function completeWorkoutSessionRecord(
  ctx: MemberContext,
  sessionId: string,
): Promise<void> {
  const { workoutSessions } = getRepositories();
  const gymId = ctx.gymId;
  const memberId = ctx.memberId;

  const session = await workoutSessions.getActiveSessionForMember(
    ctx,
    gymId,
    memberId,
    sessionId,
  );
  if (!session) {
    throw new Error("Active workout session not found.");
  }

  const completedAtMs = Date.now();
  const durationSeconds = Math.max(
    0,
    Math.round(
      (completedAtMs - session.startedAt.toMillis()) / 1000,
    ),
  );

  const db = getFirestoreDb();
  await db.runTransaction(async (tx) => {
    await workoutSessions.completeSessionInTransaction(
      tx,
      ctx,
      gymId,
      sessionId,
      durationSeconds,
    );
  });
}
