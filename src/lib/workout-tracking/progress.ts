import { cache } from "react";

import { getRepositories } from "@/lib/firestore";
import type { MemberContext } from "@/lib/firestore/context";
import type { DocWithId } from "@/lib/firestore/repositories/base";
import type { WorkoutPlanDoc, WorkoutSessionDoc } from "@/lib/firestore/types";
import {
  buildPlanExerciseMap,
  collectLibraryExerciseIdsFromPlan,
  findPlanExercisesByIdentity,
  planExerciseDisplayName,
  resolvePlanExerciseTrackingType,
  resolveProgressTrackingType,
} from "@/lib/workout-tracking/session-plan";
import {
  collectLibraryExerciseIdsFromSessionExercises,
  matchesSessionExerciseIdentity,
  resolveSessionExerciseContext,
} from "@/lib/workout-tracking/session-exercise-identity";
import { getExerciseLibraryMapByIds } from "@/lib/workout-tracking/exercise-library";
import type { ExerciseLibraryMap } from "@/lib/workout-tracking/session-plan";
import { parseTargetReps } from "@/lib/workout-tracking/progress-format";
import type {
  ExerciseProgressData,
  ExerciseProgressOption,
  ExerciseProgressPoint,
  ExerciseTrackingType,
  ProgressGrouping,
} from "@/lib/workout-tracking/types";

export type {
  ExerciseProgressData,
  ExerciseProgressOption,
  ExerciseProgressPoint,
  ProgressGrouping,
} from "@/lib/workout-tracking/types";

export type MemberExerciseProgressData = ExerciseProgressData & {
  pointsByGrouping: Record<ProgressGrouping, ExerciseProgressPoint[]>;
};

type SessionMaxEntry = {
  date: Date;
  maxWeightKg: number | null;
  maxDurationSeconds: number | null;
};

type MemberProgressContext = {
  plan: DocWithId<WorkoutPlanDoc> | null;
  completedSessions: DocWithId<WorkoutSessionDoc>[];
  library: ExerciseLibraryMap;
  planExerciseMap: ReturnType<typeof buildPlanExerciseMap> | null;
};

function memberContext(gymId: string, memberId: string): MemberContext {
  return { kind: "member", gymId, memberId };
}

const loadMemberProgressContext = (
  typeof cache === "function" ? cache : <T extends (...args: never[]) => unknown>(fn: T) => fn
)(
  async (
    tenantGymId: string,
    memberId: string,
  ): Promise<MemberProgressContext> => {
    const ctx = memberContext(tenantGymId, memberId);
    const { workoutPlans, workoutSessions } = getRepositories();

    const [plan, completedSessions] = await Promise.all([
      workoutPlans.findByMemberId(ctx, tenantGymId, memberId),
      workoutSessions.listCompletedForMember(ctx, tenantGymId, memberId),
    ]);

    const library = plan
      ? await getExerciseLibraryMapByIds(
          tenantGymId,
          [
            ...new Set([
              ...collectLibraryExerciseIdsFromPlan(plan),
              ...completedSessions.flatMap((session) =>
                collectLibraryExerciseIdsFromSessionExercises(
                  session.exercises,
                ),
              ),
            ]),
          ],
        )
      : new Map();

    return {
      plan,
      completedSessions,
      library,
      planExerciseMap: plan ? buildPlanExerciseMap(plan) : null,
    };
  },
) as (
  tenantGymId: string,
  memberId: string,
) => Promise<MemberProgressContext>;

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

function parseExerciseKey(exerciseKey: string): {
  exerciseId: string | null;
  customName: string | null;
} {
  const isCustom = exerciseKey.startsWith("custom:");
  return {
    exerciseId: isCustom ? null : exerciseKey,
    customName: isCustom ? exerciseKey.slice("custom:".length) : null,
  };
}

function bucketSessionMax(
  sessionMax: Map<string, SessionMaxEntry>,
  displayTrackingType: ExerciseTrackingType,
  grouping: ProgressGrouping,
): ExerciseProgressPoint[] {
  const bucketed = new Map<string, SessionMaxEntry>();

  for (const entry of sessionMax.values()) {
    const key = bucketKey(entry.date, grouping);
    const current = bucketed.get(key);
    const entryValue =
      displayTrackingType === "TIME"
        ? (entry.maxDurationSeconds ?? 0)
        : (entry.maxWeightKg ?? 0);
    const currentValue =
      displayTrackingType === "TIME"
        ? (current?.maxDurationSeconds ?? 0)
        : (current?.maxWeightKg ?? 0);
    if (!current || entryValue > currentValue) {
      bucketed.set(key, entry);
    }
  }

  return [...bucketed.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({
      label: bucketLabel(key, grouping),
      maxWeightKg: value.maxWeightKg,
      maxDurationSeconds: value.maxDurationSeconds,
      sessionDate: value.date.toISOString(),
    }));
}

function emptyProgressPayload(
  exerciseName: string,
  trackingType: ExerciseTrackingType,
  targetWeightKg: number | null,
): MemberExerciseProgressData {
  return {
    exerciseName,
    trackingType,
    targetWeightKg,
    points: [],
    pointsByGrouping: { weekly: [], monthly: [] },
  };
}

function scanSessionMaxForExercise(
  context: MemberProgressContext,
  exerciseId: string | null,
  customName: string | null,
): {
  sessionMax: Map<string, SessionMaxEntry>;
  observedSessionTypes: ExerciseTrackingType[];
} {
  const { plan, completedSessions, library, planExerciseMap } = context;
  const sessionMax = new Map<string, SessionMaxEntry>();
  const observedSessionTypes: ExerciseTrackingType[] = [];

  if (!plan || !planExerciseMap || completedSessions.length === 0) {
    return { sessionMax, observedSessionTypes };
  }

  for (const session of completedSessions) {
    const sessionDate =
      session.completedAt?.toDate() ?? session.startedAt.toDate();

    for (const sessionExercise of session.exercises) {
      if (
        !matchesSessionExerciseIdentity(
          sessionExercise,
          planExerciseMap,
          exerciseId,
          customName,
        )
      ) {
        continue;
      }

      const exerciseContext = resolveSessionExerciseContext(
        sessionExercise,
        planExerciseMap,
      );
      if (!exerciseContext) continue;

      let maxWeightKg: number | null = null;
      let maxDurationSeconds: number | null = null;
      const sessionTrackingType = resolvePlanExerciseTrackingType(
        exerciseContext,
        library,
      );

      for (const set of sessionExercise.sets) {
        if (sessionTrackingType === "TIME") {
          if (set.durationSeconds == null) continue;
          maxDurationSeconds =
            maxDurationSeconds == null
              ? set.durationSeconds
              : Math.max(maxDurationSeconds, set.durationSeconds);
          continue;
        }

        if (sessionTrackingType === "BODYWEIGHT") {
          const reps =
            set.weightKg ?? parseTargetReps(exerciseContext.targetReps);
          if (reps == null) continue;
          maxWeightKg =
            maxWeightKg == null ? reps : Math.max(maxWeightKg, reps);
          continue;
        }

        if (set.weightKg == null) continue;
        maxWeightKg =
          maxWeightKg == null
            ? set.weightKg
            : Math.max(maxWeightKg, set.weightKg);
      }

      if (sessionTrackingType === "TIME") {
        if (maxDurationSeconds == null) continue;
      } else if (maxWeightKg == null) {
        continue;
      }

      const existing = sessionMax.get(session.id);
      if (sessionTrackingType === "TIME") {
        if (
          !existing ||
          maxDurationSeconds! > (existing.maxDurationSeconds ?? 0)
        ) {
          sessionMax.set(session.id, {
            date: sessionDate,
            maxWeightKg: null,
            maxDurationSeconds,
          });
          observedSessionTypes.push(sessionTrackingType);
        }
        continue;
      }

      if (!existing || maxWeightKg! > (existing.maxWeightKg ?? 0)) {
        sessionMax.set(session.id, {
          date: sessionDate,
          maxWeightKg,
          maxDurationSeconds: null,
        });
        observedSessionTypes.push(sessionTrackingType);
      }
    }
  }

  return { sessionMax, observedSessionTypes };
}

function buildExerciseProgressFromContext(
  context: MemberProgressContext,
  exerciseKey: string,
  grouping: ProgressGrouping,
): MemberExerciseProgressData | null {
  const { exerciseId, customName } = parseExerciseKey(exerciseKey);
  if (!exerciseId && (customName == null || customName === "")) {
    return emptyProgressPayload(customName ?? "Exercise", "WEIGHTED", null);
  }

  const { plan, library } = context;
  const planMatches = plan
    ? findPlanExercisesByIdentity(plan, exerciseId, customName)
    : [];
  const planExercise = planMatches[0] ?? null;

  const exerciseName = planExercise
    ? planExerciseDisplayName(planExercise, library)
    : (customName ?? "Exercise");
  const trackingType: ExerciseTrackingType = resolveProgressTrackingType(
    planMatches,
    library,
    exerciseId,
  );

  if (!plan || context.completedSessions.length === 0) {
    return emptyProgressPayload(
      exerciseName,
      trackingType,
      planExercise?.targetWeightKg ?? null,
    );
  }

  const { sessionMax, observedSessionTypes } = scanSessionMaxForExercise(
    context,
    exerciseId,
    customName,
  );

  const displayTrackingType = resolveProgressTrackingType(
    planMatches,
    library,
    exerciseId,
    observedSessionTypes,
  );

  if (sessionMax.size === 0) {
    return emptyProgressPayload(
      exerciseName,
      displayTrackingType,
      planExercise?.targetWeightKg ?? null,
    );
  }

  const pointsByGrouping: Record<ProgressGrouping, ExerciseProgressPoint[]> = {
    weekly: bucketSessionMax(sessionMax, displayTrackingType, "weekly"),
    monthly: bucketSessionMax(sessionMax, displayTrackingType, "monthly"),
  };

  return {
    exerciseName,
    trackingType: displayTrackingType,
    targetWeightKg: planExercise?.targetWeightKg ?? null,
    points: pointsByGrouping[grouping],
    pointsByGrouping,
  };
}

function buildMemberExerciseOptionsFromContext(
  context: MemberProgressContext,
): ExerciseProgressOption[] {
  const { plan, completedSessions, library, planExerciseMap } = context;
  if (!plan || !planExerciseMap) return [];

  const seen = new Set<string>();
  const options: ExerciseProgressOption[] = [];
  const days = [...(plan.days ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);

  for (const day of days) {
    const exercises = [...day.exercises].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
    for (const row of exercises) {
      const option = row.exerciseId
        ? {
            key: row.exerciseId,
            label: planExerciseDisplayName(row, library),
          }
        : {
            key: `custom:${row.customName ?? "Custom exercise"}`,
            label: row.customName ?? "Custom exercise",
          };
      if (seen.has(option.key)) continue;
      seen.add(option.key);
      options.push(option);
    }
  }

  for (const session of completedSessions) {
    for (const sessionExercise of session.exercises) {
      if (sessionExercise.sets.length === 0) continue;

      const exerciseContext = resolveSessionExerciseContext(
        sessionExercise,
        planExerciseMap,
      );
      if (!exerciseContext) continue;

      const option = exerciseContext.exerciseId
        ? {
            key: exerciseContext.exerciseId,
            label: planExerciseDisplayName(exerciseContext, library),
          }
        : {
            key: `custom:${exerciseContext.customName ?? "Custom exercise"}`,
            label: exerciseContext.customName ?? "Custom exercise",
          };
      if (seen.has(option.key)) continue;
      if (
        findPlanExercisesByIdentity(
          plan,
          exerciseContext.exerciseId,
          exerciseContext.customName,
        ).length > 0
      ) {
        continue;
      }
      seen.add(option.key);
      options.push(option);
    }
  }

  return options;
}

export async function loadMemberWorkoutProgressPage(
  tenantGymId: string,
  memberId: string,
  exerciseKey: string | undefined,
  grouping: ProgressGrouping,
): Promise<{
  exercises: ExerciseProgressOption[];
  exerciseKey: string | undefined;
  progress: MemberExerciseProgressData | null;
}> {
  const context = await loadMemberProgressContext(tenantGymId, memberId);
  const exercises = buildMemberExerciseOptionsFromContext(context);

  const resolvedExerciseKey =
    exerciseKey && exercises.some((e) => e.key === exerciseKey)
      ? exerciseKey
      : exercises[0]?.key;

  const progress = resolvedExerciseKey
    ? buildExerciseProgressFromContext(
        context,
        resolvedExerciseKey,
        grouping,
      )
    : null;

  return {
    exercises,
    exerciseKey: resolvedExerciseKey,
    progress,
  };
}

export async function getExerciseProgressData(
  tenantGymId: string,
  memberId: string,
  exerciseKey: string,
  grouping: ProgressGrouping = "weekly",
): Promise<ExerciseProgressData | null> {
  const context = await loadMemberProgressContext(tenantGymId, memberId);
  const progress = buildExerciseProgressFromContext(
    context,
    exerciseKey,
    grouping,
  );
  if (!progress) return null;
  const { pointsByGrouping: _ignored, ...data } = progress;
  return data;
}

export async function getMemberExerciseOptions(
  tenantGymId: string,
  memberId: string,
): Promise<ExerciseProgressOption[]> {
  const context = await loadMemberProgressContext(tenantGymId, memberId);
  return buildMemberExerciseOptionsFromContext(context);
}
