import { prisma } from "@/lib/prisma";

export type PreviousSetLog = {
  setNumber: number;
  weightKg: number | null;
  durationSeconds: number | null;
};

export type PreviousSetsBySessionExerciseId = Record<string, PreviousSetLog[]>;

type ExerciseIdentity = {
  sessionExerciseId: string;
  exerciseId: string | null;
  customName: string | null;
};

function identityKey(exerciseId: string | null, customName: string | null): string | null {
  if (exerciseId) return `id:${exerciseId}`;
  if (customName != null && customName !== "") return `custom:${customName}`;
  return null;
}

export async function getPreviousSetsForSessionExercises(
  tenantGymId: string,
  memberId: string,
  exercises: ExerciseIdentity[],
): Promise<PreviousSetsBySessionExerciseId> {
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

  const lookups = await Promise.all(
    [...unique.entries()].map(async ([key, identity]) => {
      const match = identity.exerciseId
        ? { exerciseId: identity.exerciseId }
        : { customName: identity.customName ?? "" };

      const previous = await prisma.workoutSessionExercise.findFirst({
        where: {
          gymId: tenantGymId,
          session: {
            gymId: tenantGymId,
            memberId,
            status: "COMPLETED",
          },
          planExercise: match,
        },
        orderBy: { session: { completedAt: "desc" } },
        select: {
          sets: {
            orderBy: { setNumber: "asc" },
            select: {
              setNumber: true,
              weightKg: true,
              durationSeconds: true,
            },
          },
        },
      });

      return {
        key,
        sets: (previous?.sets ?? []).map((set) => ({
          setNumber: set.setNumber,
          weightKg: set.weightKg != null ? Number(set.weightKg) : null,
          durationSeconds: set.durationSeconds,
        })),
      };
    }),
  );

  const byIdentity = new Map(lookups.map((row) => [row.key, row.sets]));
  const result: PreviousSetsBySessionExerciseId = {};
  for (const exercise of exercises) {
    const key = identityKey(exercise.exerciseId, exercise.customName);
    result[exercise.sessionExerciseId] = key ? (byIdentity.get(key) ?? []) : [];
  }
  return result;
}
