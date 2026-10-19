import { getFirestoreDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firestore/collections";
import { getRepositories } from "@/lib/firestore";
import type { MemberContext } from "@/lib/firestore/context";
import { newDocId } from "@/lib/firestore/helpers";
import type { ExerciseTrackingType, WorkoutSessionDoc } from "@/lib/firestore/types";
import { measureServerPhase } from "@/lib/server-perf";
import {
  hasSessionExerciseSnapshot,
  resolveSessionExerciseContext,
} from "@/lib/workout-tracking/session-exercise-identity";
import { buildPlanExerciseMap, resolvePlanExerciseTrackingType } from "@/lib/workout-tracking/session-plan";
import { getExerciseLibraryMapByIds } from "@/lib/workout-tracking/exercise-library";
import {
  PERSONAL_WORKOUT_DAY_ID,
  personalWorkoutToPlanDoc,
} from "@/lib/workout-tracking/member-personal-workout-plan";
import { resolvePlanDocForWorkoutSession } from "@/lib/workout-tracking/resolve-session-plan-doc";
import {
  catalogTrackingType,
  parseMemberCatalogExerciseId,
} from "@/lib/workout-tracking/member-catalog-exercises";
import { attendanceDateKey } from "@/lib/attendance/date-key";
import { countLoggedSetsInSession } from "@/lib/workout-tracking/session-logged-sets";
import { WorkoutEmptyConfirmationRequiredError } from "@/lib/workout-tracking/workout-completion-errors";
import type { ActiveWorkoutSetLog } from "@/lib/workout-tracking/types";

async function loadExerciseLibraryMapForTracking(
  ctx: MemberContext,
  gymId: string,
  exerciseId: string | null | undefined,
) {
  const id = exerciseId?.trim();
  if (!id) return new Map();
  const catalogId = parseMemberCatalogExerciseId(id);
  if (catalogId) {
    const { exerciseCatalog } = getRepositories();
    const doc = await exerciseCatalog.getByCatalogId(ctx, catalogId);
    if (!doc) return new Map();
    const trackingType = catalogTrackingType(doc);
    return new Map([
      [
        id,
        {
          name: doc.name,
          muscleGroup: doc.muscleGroup,
          trackingType,
          isSeeded: false,
        },
      ],
    ]);
  }
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

export async function startPersonalWorkoutSessionRecord(
  ctx: MemberContext,
  personalWorkoutId: string,
): Promise<{ sessionId: string; resumed: boolean }> {
  const { memberPersonalWorkouts, workoutSessions } = getRepositories();
  const gymId = ctx.gymId;
  const memberId = ctx.memberId;

  const [personal, existing] = await Promise.all([
    memberPersonalWorkouts.getForMember(ctx, gymId, memberId, personalWorkoutId),
    workoutSessions.findActiveSession(ctx, gymId, memberId),
  ]);

  if (!personal || personal.exercises.length === 0) {
    throw new Error("Add at least one exercise before starting.");
  }

  if (existing) {
    return { sessionId: existing.id, resumed: true };
  }

  const planShell = personalWorkoutToPlanDoc(personal);
  const day = planShell.days[0];
  if (!day || day.exercises.length === 0) {
    throw new Error("Add at least one exercise before starting.");
  }

  const sessionId = newDocId();
  const { sessionId: resolvedId, created } =
    await workoutSessions.createSessionIfNoActive(ctx, gymId, sessionId, {
      memberId,
      workoutPlanId: personal.id,
      workoutPlanDayId: PERSONAL_WORKOUT_DAY_ID,
      sessionKind: "PERSONAL",
      personalWorkoutId: personal.id,
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
  return measureServerPhase("member.workout.logSet.total", async () => {
    const { workoutPlans, workoutSessions } = getRepositories();
    const gymId = ctx.gymId;
    const memberId = ctx.memberId;

    const active = await measureServerPhase(
      "member.workout.logSet.sessionLookup",
      () => workoutSessions.findActiveSession(ctx, gymId, memberId),
    );
    if (!active) {
      throw new Error("Workout session not found.");
    }

    const sessionExercise = active.exercises.find(
      (row) => row.id === input.sessionExerciseId,
    );
    if (!sessionExercise) {
      throw new Error("Workout session not found.");
    }

    let exerciseContext = null;
    if (hasSessionExerciseSnapshot(sessionExercise)) {
      exerciseContext = resolveSessionExerciseContext(
        sessionExercise,
        new Map(),
      );
    } else {
      const plan = await measureServerPhase(
        "member.workout.logSet.planLookup",
        () => resolvePlanDocForWorkoutSession(ctx, gymId, memberId, active),
      );
      if (!plan) {
        throw new Error("Workout session not found.");
      }
      exerciseContext = resolveSessionExerciseContext(
        sessionExercise,
        buildPlanExerciseMap(plan),
      );
    }

    if (!exerciseContext) {
      throw new Error("Workout session not found.");
    }

    let trackingType: ExerciseTrackingType;
    if (exerciseContext.trackingTypeOverride) {
      trackingType = exerciseContext.trackingTypeOverride;
    } else if (exerciseContext.exerciseId) {
      const library = await measureServerPhase(
        "member.workout.logSet.libraryLookup",
        () =>
          loadExerciseLibraryMapForTracking(
            ctx,
            gymId,
            exerciseContext.exerciseId,
          ),
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
    await measureServerPhase("member.workout.logSet.firestoreWrite", () =>
      db.runTransaction(async (tx) => {
        await workoutSessions.upsertSetLogInTransaction(
          tx,
          ctx,
          gymId,
          active.id,
          input.sessionExerciseId,
          input.setNumber,
          setValues,
        );
      }),
    );

    return {
      sessionExerciseId: input.sessionExerciseId,
      set: {
        setNumber: input.setNumber,
        weightKg: setValues.weightKg,
        durationSeconds: setValues.durationSeconds,
      },
    };
  });
}

export type CompleteWorkoutSessionResult = {
  outcome: "completed" | "abandoned";
  attendanceRecorded: boolean;
};

export async function completeWorkoutSessionRecord(
  ctx: MemberContext,
  sessionId: string,
  options?: { confirmEmptyFinish?: boolean },
): Promise<CompleteWorkoutSessionResult> {
  const { workoutSessions, attendance, members } = getRepositories();
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

  const loggedSets = countLoggedSetsInSession(session);
  if (loggedSets === 0 && !options?.confirmEmptyFinish) {
    throw new WorkoutEmptyConfirmationRequiredError();
  }

  const member = await members.findByIdAndGym(ctx, memberId, gymId);
  if (!member) {
    throw new Error("Member not found.");
  }

  const db = getFirestoreDb();
  if (loggedSets === 0) {
    await db.runTransaction(async (tx) => {
      await workoutSessions.abandonSessionInTransaction(
        tx,
        ctx,
        gymId,
        sessionId,
      );
    });
    return { outcome: "abandoned", attendanceRecorded: false };
  }

  const completedAtMs = Date.now();
  const completedAt = new Date(completedAtMs);
  const dateKey = attendanceDateKey(completedAt);
  const durationSeconds = Math.max(
    0,
    Math.round((completedAtMs - session.startedAt.toMillis()) / 1000),
  );

  let attendanceRecorded = false;
  let alreadyCompleted = false;
  await db.runTransaction(async (tx) => {
    const sessionRef = db.collection(COLLECTIONS.workoutSessions).doc(sessionId);
    const sessionSnap = await tx.get(sessionRef);
    if (!sessionSnap.exists) {
      throw new Error("Active workout session not found.");
    }
    const fresh = sessionSnap.data() as WorkoutSessionDoc;
    if (fresh.gymId !== gymId || fresh.memberId !== memberId) {
      throw new Error("Active workout session not found.");
    }
    if (fresh.status === "COMPLETED") {
      alreadyCompleted = true;
      return;
    }
    if (fresh.status !== "IN_PROGRESS") {
      throw new Error("Active workout session not found.");
    }
    const freshSets = countLoggedSetsInSession(fresh);
    if (freshSets === 0) {
      throw new Error("No sets logged.");
    }

    const attendanceQuery = attendance.memberDateAttendanceQuery(
      gymId,
      member.id,
      dateKey,
    );
    const attendanceSnap = await tx.get(attendanceQuery);
    const memberRef = db.collection(COLLECTIONS.members).doc(member.id);
    const memberSnap = await tx.get(memberRef);

    workoutSessions.completeSessionWriteInTransaction(
      tx,
      ctx,
      gymId,
      sessionId,
      durationSeconds,
    );

    attendanceRecorded = attendance.writeMemberVisitIfAbsentInTransaction(
      tx,
      ctx,
      gymId,
      member,
      completedAt,
      dateKey,
      "workout",
      attendanceSnap,
      memberSnap,
    );
  });

  if (alreadyCompleted) {
    return { outcome: "completed", attendanceRecorded: false };
  }

  return { outcome: "completed", attendanceRecorded };
}
