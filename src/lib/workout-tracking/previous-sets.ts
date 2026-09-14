import { getRepositories } from "@/lib/firestore";
import type { MemberContext } from "@/lib/firestore/context";
import {
  buildPlanExerciseMap,
  matchesPlanExerciseIdentity,
} from "@/lib/workout-tracking/session-plan";
import type {
  PreviousSetLog,
  PreviousSetsBySessionExerciseId,
} from "@/lib/workout-tracking/types";

export type { PreviousSetLog, PreviousSetsBySessionExerciseId } from "@/lib/workout-tracking/types";

type ExerciseIdentity = {
  sessionExerciseId: string;
  exerciseId: string | null;
  customName: string | null;
};

function identityKey(
  exerciseId: string | null,
  customName: string | null,
): string | null {
  if (exerciseId) return `id:${exerciseId}`;
  if (customName != null && customName !== "") return `custom:${customName}`;
  return null;
}

function memberContext(gymId: string, memberId: string): MemberContext {
  return { kind: "member", gymId, memberId };
}

export async function getPreviousSetsForSessionExercises(
  tenantGymId: string,
  memberId: string,
  exercises: ExerciseIdentity[],
): Promise<PreviousSetsBySessionExerciseId> {
  const ctx = memberContext(tenantGymId, memberId);
  const { workoutPlans, workoutSessions } = getRepositories();

  const unique = new Map<
    string,
    { exerciseId: string | null; customName: string | null }
  >();
  for (const exercise of exercises) {
    const key = identityKey(exercise.exerciseId, exercise.customName);
    if (!key || unique.has(key)) continue;
    unique.set(key, {
      exerciseId: exercise.exerciseId,
      customName: exercise.customName,
    });
  }

  if (unique.size === 0) {
    return Object.fromEntries(
      exercises.map((exercise) => [exercise.sessionExerciseId, []]),
    );
  }

  const [plan, completedSessions] = await Promise.all([
    workoutPlans.findByMemberId(ctx, tenantGymId, memberId),
    workoutSessions.listCompletedForMember(ctx, tenantGymId, memberId),
  ]);

  const planExerciseMap = plan ? buildPlanExerciseMap(plan) : new Map();
  const byIdentity = new Map<string, PreviousSetLog[]>();

  for (const [key, identity] of unique.entries()) {
    let matchedSets: PreviousSetLog[] = [];

    for (const session of completedSessions) {
      for (const sessionExercise of session.exercises) {
        const planExercise = planExerciseMap.get(
          sessionExercise.workoutPlanExerciseId,
        );
        if (!planExercise) continue;
        if (
          !matchesPlanExerciseIdentity(
            planExercise,
            identity.exerciseId,
            identity.customName,
          )
        ) {
          continue;
        }
        matchedSets = sessionExercise.sets
          .slice()
          .sort((a, b) => a.setNumber - b.setNumber)
          .map((set) => ({
            setNumber: set.setNumber,
            weightKg: set.weightKg,
            durationSeconds: set.durationSeconds,
          }));
        break;
      }
      if (matchedSets.length > 0) break;
    }

    byIdentity.set(key, matchedSets);
  }

  const result: PreviousSetsBySessionExerciseId = {};
  for (const exercise of exercises) {
    const key = identityKey(exercise.exerciseId, exercise.customName);
    result[exercise.sessionExerciseId] = key
      ? (byIdentity.get(key) ?? [])
      : [];
  }
  return result;
}
