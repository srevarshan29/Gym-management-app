-- Workout tracking Phase 1: exercise library + structured plan exercises.

CREATE TYPE "MuscleGroup" AS ENUM (
  'CHEST',
  'BACK',
  'LEGS',
  'SHOULDERS',
  'ARMS',
  'CORE'
);

CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "muscleGroup" "MuscleGroup" NOT NULL,
    "defaultSets" INTEGER,
    "defaultReps" TEXT,
    "defaultTempo" TEXT,
    "defaultRestSeconds" INTEGER,
    "isSeeded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Exercise_gymId_name_key" ON "Exercise"("gymId", "name");
CREATE INDEX "Exercise_gymId_muscleGroup_idx" ON "Exercise"("gymId", "muscleGroup");

ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_gymId_fkey"
  FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkoutPlan" ADD COLUMN "durationWeeks" INTEGER;
ALTER TABLE "WorkoutPlan" ADD COLUMN "focusGoal" TEXT;
ALTER TABLE "WorkoutPlan" ALTER COLUMN "level" DROP NOT NULL;
ALTER TABLE "WorkoutPlan" ALTER COLUMN "weeklySchedule" DROP NOT NULL;

CREATE TABLE "WorkoutPlanExercise" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "workoutPlanId" TEXT NOT NULL,
    "exerciseId" TEXT,
    "customName" TEXT,
    "sortOrder" INTEGER NOT NULL,
    "targetSets" INTEGER NOT NULL,
    "targetReps" TEXT NOT NULL,
    "tempo" TEXT,
    "restSeconds" INTEGER,
    "targetWeightKg" DECIMAL(6,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutPlanExercise_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WorkoutPlanExercise_workoutPlanId_sortOrder_idx" ON "WorkoutPlanExercise"("workoutPlanId", "sortOrder");
CREATE INDEX "WorkoutPlanExercise_gymId_idx" ON "WorkoutPlanExercise"("gymId");
CREATE INDEX "WorkoutPlanExercise_exerciseId_idx" ON "WorkoutPlanExercise"("exerciseId");

ALTER TABLE "WorkoutPlanExercise" ADD CONSTRAINT "WorkoutPlanExercise_workoutPlanId_fkey"
  FOREIGN KEY ("workoutPlanId") REFERENCES "WorkoutPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkoutPlanExercise" ADD CONSTRAINT "WorkoutPlanExercise_exerciseId_fkey"
  FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Exercise" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Exercise" FORCE ROW LEVEL SECURITY;

ALTER TABLE "WorkoutPlanExercise" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkoutPlanExercise" FORCE ROW LEVEL SECURITY;

CREATE POLICY exercise_tenant_all ON "Exercise" FOR ALL
  USING ("gymId" = app_current_gym_id())
  WITH CHECK ("gymId" = app_current_gym_id());

CREATE POLICY workout_plan_exercise_tenant_all ON "WorkoutPlanExercise" FOR ALL
  USING ("gymId" = app_current_gym_id())
  WITH CHECK ("gymId" = app_current_gym_id());

-- Seed starter exercises for every existing gym.
INSERT INTO "Exercise" ("id", "gymId", "name", "muscleGroup", "defaultSets", "defaultReps", "defaultTempo", "defaultRestSeconds", "isSeeded", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  g."id",
  seed.name,
  seed."muscleGroup"::"MuscleGroup",
  seed."defaultSets",
  seed."defaultReps",
  seed."defaultTempo",
  seed."defaultRestSeconds",
  true,
  NOW(),
  NOW()
FROM "Gym" g
CROSS JOIN (
  VALUES
    ('Bench Press', 'CHEST', 4, '8-10', NULL, 90),
    ('Incline DB Press', 'CHEST', 3, '10-12', NULL, 90),
    ('Push Ups', 'CHEST', 3, '12-15', NULL, 60),
    ('Cable Fly', 'CHEST', 3, '12-15', NULL, 60),
    ('Dips', 'CHEST', 3, '8-12', NULL, 90),
    ('Lat Pulldown', 'BACK', 4, '10-12', NULL, 90),
    ('Barbell Row', 'BACK', 4, '8-10', NULL, 90),
    ('Seated Cable Row', 'BACK', 3, '10-12', NULL, 75),
    ('Pull Ups', 'BACK', 3, '6-10', NULL, 120),
    ('Deadlift', 'BACK', 4, '5-6', NULL, 180),
    ('Squat', 'LEGS', 4, '6-8', NULL, 120),
    ('Leg Press', 'LEGS', 4, '10-12', NULL, 90),
    ('Lunges', 'LEGS', 3, '10 each', NULL, 75),
    ('Romanian Deadlift', 'LEGS', 3, '8-10', NULL, 90),
    ('Leg Curl', 'LEGS', 3, '12-15', NULL, 60),
    ('Calf Raise', 'LEGS', 4, '15-20', NULL, 45),
    ('Overhead Press', 'SHOULDERS', 4, '6-8', NULL, 90),
    ('DB Shoulder Press', 'SHOULDERS', 3, '10-12', NULL, 75),
    ('Lateral Raises', 'SHOULDERS', 3, '12-15', NULL, 45),
    ('Face Pulls', 'SHOULDERS', 3, '15-20', NULL, 45),
    ('Barbell Curl', 'ARMS', 3, '10-12', NULL, 60),
    ('DB Curl', 'ARMS', 3, '10-12', NULL, 60),
    ('Hammer Curl', 'ARMS', 3, '10-12', NULL, 60),
    ('Tricep Pushdown', 'ARMS', 3, '12-15', NULL, 60),
    ('Skull Crushers', 'ARMS', 3, '10-12', NULL, 60),
    ('Plank', 'CORE', 3, '45-60s', NULL, 45),
    ('Hanging Leg Raise', 'CORE', 3, '10-15', NULL, 60),
    ('Cable Crunch', 'CORE', 3, '15-20', NULL, 45),
    ('Russian Twist', 'CORE', 3, '20', NULL, 45)
) AS seed(name, "muscleGroup", "defaultSets", "defaultReps", "defaultTempo", "defaultRestSeconds")
ON CONFLICT ("gymId", "name") DO NOTHING;
