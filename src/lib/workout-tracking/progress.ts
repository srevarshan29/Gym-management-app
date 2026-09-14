import { getRepositories } from "@/lib/firestore";
import type { MemberContext } from "@/lib/firestore/context";
import { platformContext } from "@/lib/firestore/helpers";
import type { WorkoutPlanDoc, WorkoutPlanExerciseEmbedded } from "@/lib/firestore/types";
import {
  buildPlanExerciseMap,
  findPlanExercisesByIdentity,
  matchesPlanExerciseIdentity,
  planExerciseDisplayName,
  resolvePlanExerciseTrackingType,
  resolveProgressTrackingType,
  type ExerciseLibraryMap,
} from "@/lib/workout-tracking/session-plan";
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

function memberContext(gymId: string, memberId: string): MemberContext {
  return { kind: "member", gymId, memberId };
}

async function loadExerciseLibraryMap(gymId: string): Promise<ExerciseLibraryMap> {
  const { customExercises } = getRepositories();
  const rows = await customExercises.listLibrary(platformContext, gymId);
  return new Map(
    rows.map((row) => [
      row.id,
      {
        name: row.name,
        muscleGroup: row.muscleGroup,
        trackingType: row.trackingType,
        isSeeded: row.isSeeded,
      },
    ]),
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

export async function getExerciseProgressData(
  tenantGymId: string,
  memberId: string,
  exerciseKey: string,
  grouping: ProgressGrouping = "weekly",
): Promise<ExerciseProgressData | null> {
  const { exerciseId, customName } = parseExerciseKey(exerciseKey);
  if (!exerciseId && (customName == null || customName === "")) {
    return {
      exerciseName: customName ?? "Exercise",
      trackingType: "WEIGHTED",
      targetWeightKg: null,
      points: [],
    };
  }

  const ctx = memberContext(tenantGymId, memberId);
  const { workoutPlans, workoutSessions } = getRepositories();

  const [plan, completedSessions, library] = await Promise.all([
    workoutPlans.findByMemberId(ctx, tenantGymId, memberId),
    workoutSessions.listCompletedForMember(ctx, tenantGymId, memberId),
    loadExerciseLibraryMap(tenantGymId),
  ]);

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

  if (!plan || completedSessions.length === 0) {
    return {
      exerciseName,
      trackingType,
      targetWeightKg: planExercise?.targetWeightKg ?? null,
      points: [],
    };
  }

  const planExerciseMap = buildPlanExerciseMap(plan);
  const observedSessionTypes: ExerciseTrackingType[] = [];
  const sessionMax = new Map<
    string,
    { date: Date; maxWeightKg: number | null; maxDurationSeconds: number | null }
  >();

  for (const session of completedSessions) {
    const sessionDate =
      session.completedAt?.toDate() ?? session.startedAt.toDate();

    for (const sessionExercise of session.exercises) {
      const matchedPlanExercise = planExerciseMap.get(
        sessionExercise.workoutPlanExerciseId,
      );
      if (!matchedPlanExercise) continue;
      if (
        !matchesPlanExerciseIdentity(
          matchedPlanExercise,
          exerciseId,
          customName,
        )
      ) {
        continue;
      }

      let maxWeightKg: number | null = null;
      let maxDurationSeconds: number | null = null;
      const sessionTrackingType = resolvePlanExerciseTrackingType(
        matchedPlanExercise,
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
            set.weightKg ?? parseTargetReps(matchedPlanExercise.targetReps);
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

  const displayTrackingType = resolveProgressTrackingType(
    planMatches,
    library,
    exerciseId,
    observedSessionTypes,
  );

  if (sessionMax.size === 0) {
    return {
      exerciseName,
      trackingType: displayTrackingType,
      targetWeightKg: planExercise?.targetWeightKg ?? null,
      points: [],
    };
  }

  const bucketed = new Map<
    string,
    { date: Date; maxWeightKg: number | null; maxDurationSeconds: number | null }
  >();

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

  const points: ExerciseProgressPoint[] = [...bucketed.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({
      label: bucketLabel(key, grouping),
      maxWeightKg: value.maxWeightKg,
      maxDurationSeconds: value.maxDurationSeconds,
      sessionDate: value.date.toISOString(),
    }));

  return {
    exerciseName,
    trackingType: displayTrackingType,
    targetWeightKg: planExercise?.targetWeightKg ?? null,
    points,
  };
}

export async function getMemberExerciseOptions(
  tenantGymId: string,
  memberId: string,
): Promise<ExerciseProgressOption[]> {
  const ctx = memberContext(tenantGymId, memberId);
  const { workoutPlans } = getRepositories();

  const [plan, library] = await Promise.all([
    workoutPlans.findByMemberId(ctx, tenantGymId, memberId),
    loadExerciseLibraryMap(tenantGymId),
  ]);

  if (!plan) return [];

  const seen = new Set<string>();
  const options: ExerciseProgressOption[] = [];
  const days = [...(plan.days ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);

  for (const day of days) {
    const exercises = [...day.exercises].sort((a, b) => a.sortOrder - b.sortOrder);
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

  return options;
}
