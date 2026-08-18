import { z } from "zod";

export const workoutPlanExerciseInputSchema = z
  .object({
    exerciseId: z.string().trim().optional().or(z.literal("")),
    customName: z.string().trim().optional().or(z.literal("")),
    targetSets: z.coerce.number().int().min(1).max(20),
    targetReps: z.string().trim().min(1).max(40),
    tempo: z.string().trim().max(20).optional().or(z.literal("")),
    restSeconds: z.coerce.number().int().min(0).max(600).optional().nullable(),
    targetWeightKg: z.coerce.number().min(0).max(500).optional().nullable(),
  })
  .refine(
    (row) => Boolean(row.exerciseId?.trim()) !== Boolean(row.customName?.trim()),
    { message: "Each exercise must be from the library or a custom name." },
  );

export const workoutPlanDayInputSchema = z.object({
  label: z.string().trim().min(1, "Enter a day label.").max(80),
  exercises: z
    .array(workoutPlanExerciseInputSchema)
    .min(1, "Each day needs at least one exercise."),
});

export const workoutPlanPayloadSchema = z.object({
  memberId: z.string().trim().min(1),
  title: z.string().trim().min(1).max(120),
  durationWeeks: z.coerce.number().int().min(1).max(52).optional().nullable(),
  focusGoal: z.string().trim().max(2000).optional().or(z.literal("")),
  days: z
    .array(workoutPlanDayInputSchema)
    .min(1, "Add at least one training day."),
});

export type WorkoutPlanExerciseInput = z.infer<
  typeof workoutPlanExerciseInputSchema
>;

export type WorkoutPlanDayInput = z.infer<typeof workoutPlanDayInputSchema>;

export type WorkoutPlanPayload = z.infer<typeof workoutPlanPayloadSchema>;

export type WorkoutPlanExerciseView = {
  id: string;
  exerciseId: string | null;
  customName: string | null;
  displayName: string;
  muscleGroup: string | null;
  sortOrder: number;
  targetSets: number;
  targetReps: string;
  tempo: string | null;
  restSeconds: number | null;
  targetWeightKg: number | null;
};

export type WorkoutPlanDayView = {
  id: string;
  label: string;
  sortOrder: number;
  exercises: WorkoutPlanExerciseView[];
};

export type WorkoutPlanDetail = {
  id: string;
  memberId: string;
  memberName: string;
  title: string;
  durationWeeks: number | null;
  focusGoal: string | null;
  level: string | null;
  weeklySchedule: string | null;
  isLegacy: boolean;
  days: WorkoutPlanDayView[];
};

export type ExerciseListItem = {
  id: string;
  name: string;
  muscleGroup: string;
  defaultSets: number | null;
  defaultReps: string | null;
  defaultTempo: string | null;
  defaultRestSeconds: number | null;
  isSeeded: boolean;
};
