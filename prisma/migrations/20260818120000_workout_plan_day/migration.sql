-- Training days within a workout plan (Push/Pull/Legs, etc.).

CREATE TABLE "WorkoutPlanDay" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "workoutPlanId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutPlanDay_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WorkoutPlanDay_workoutPlanId_sortOrder_idx" ON "WorkoutPlanDay"("workoutPlanId", "sortOrder");
CREATE INDEX "WorkoutPlanDay_gymId_idx" ON "WorkoutPlanDay"("gymId");

ALTER TABLE "WorkoutPlanDay" ADD CONSTRAINT "WorkoutPlanDay_gymId_fkey"
  FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkoutPlanDay" ADD CONSTRAINT "WorkoutPlanDay_workoutPlanId_fkey"
  FOREIGN KEY ("workoutPlanId") REFERENCES "WorkoutPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkoutPlanDay" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkoutPlanDay" FORCE ROW LEVEL SECURITY;

CREATE POLICY workout_plan_day_tenant_all ON "WorkoutPlanDay" FOR ALL
  USING ("gymId" = app_current_gym_id())
  WITH CHECK ("gymId" = app_current_gym_id());

-- Existing structured plans become a single "Day 1". Legacy text-only plans stay day-less.
INSERT INTO "WorkoutPlanDay" ("id", "gymId", "workoutPlanId", "label", "sortOrder", "createdAt", "updatedAt")
SELECT
  'wpd_' || replace(gen_random_uuid()::text, '-', ''),
  p."gymId",
  p.id,
  'Day 1',
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "WorkoutPlan" p
WHERE EXISTS (
  SELECT 1 FROM "WorkoutPlanExercise" e WHERE e."workoutPlanId" = p.id
);

ALTER TABLE "WorkoutPlanExercise" ADD COLUMN "workoutPlanDayId" TEXT;

UPDATE "WorkoutPlanExercise" e
SET "workoutPlanDayId" = d.id
FROM "WorkoutPlanDay" d
WHERE d."workoutPlanId" = e."workoutPlanId";

ALTER TABLE "WorkoutPlanExercise" ALTER COLUMN "workoutPlanDayId" SET NOT NULL;

ALTER TABLE "WorkoutPlanExercise" ADD CONSTRAINT "WorkoutPlanExercise_workoutPlanDayId_fkey"
  FOREIGN KEY ("workoutPlanDayId") REFERENCES "WorkoutPlanDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "WorkoutPlanExercise_workoutPlanDayId_sortOrder_idx"
  ON "WorkoutPlanExercise"("workoutPlanDayId", "sortOrder");

ALTER TABLE "WorkoutSession" ADD COLUMN "workoutPlanDayId" TEXT;

ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_workoutPlanDayId_fkey"
  FOREIGN KEY ("workoutPlanDayId") REFERENCES "WorkoutPlanDay"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "WorkoutSession_workoutPlanDayId_idx" ON "WorkoutSession"("workoutPlanDayId");
