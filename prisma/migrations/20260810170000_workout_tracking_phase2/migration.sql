-- Workout tracking Phase 2: session logging.

CREATE TYPE "WorkoutSessionStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

CREATE TABLE "WorkoutSession" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "workoutPlanId" TEXT NOT NULL,
    "status" "WorkoutSessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,

    CONSTRAINT "WorkoutSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WorkoutSession_gymId_memberId_status_idx" ON "WorkoutSession"("gymId", "memberId", "status");
CREATE INDEX "WorkoutSession_workoutPlanId_idx" ON "WorkoutSession"("workoutPlanId");

ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_workoutPlanId_fkey"
  FOREIGN KEY ("workoutPlanId") REFERENCES "WorkoutPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "WorkoutSessionExercise" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "workoutSessionId" TEXT NOT NULL,
    "workoutPlanExerciseId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutSessionExercise_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WorkoutSessionExercise_workoutSessionId_sortOrder_idx" ON "WorkoutSessionExercise"("workoutSessionId", "sortOrder");
CREATE INDEX "WorkoutSessionExercise_gymId_idx" ON "WorkoutSessionExercise"("gymId");
CREATE INDEX "WorkoutSessionExercise_workoutPlanExerciseId_idx" ON "WorkoutSessionExercise"("workoutPlanExerciseId");

ALTER TABLE "WorkoutSessionExercise" ADD CONSTRAINT "WorkoutSessionExercise_workoutSessionId_fkey"
  FOREIGN KEY ("workoutSessionId") REFERENCES "WorkoutSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkoutSessionExercise" ADD CONSTRAINT "WorkoutSessionExercise_workoutPlanExerciseId_fkey"
  FOREIGN KEY ("workoutPlanExerciseId") REFERENCES "WorkoutPlanExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "WorkoutSetLog" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "sessionExerciseId" TEXT NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "weightKg" DECIMAL(6,2) NOT NULL,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkoutSetLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkoutSetLog_sessionExerciseId_setNumber_key" ON "WorkoutSetLog"("sessionExerciseId", "setNumber");
CREATE INDEX "WorkoutSetLog_gymId_idx" ON "WorkoutSetLog"("gymId");

ALTER TABLE "WorkoutSetLog" ADD CONSTRAINT "WorkoutSetLog_sessionExerciseId_fkey"
  FOREIGN KEY ("sessionExerciseId") REFERENCES "WorkoutSessionExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkoutSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkoutSession" FORCE ROW LEVEL SECURITY;
ALTER TABLE "WorkoutSessionExercise" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkoutSessionExercise" FORCE ROW LEVEL SECURITY;
ALTER TABLE "WorkoutSetLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkoutSetLog" FORCE ROW LEVEL SECURITY;

CREATE POLICY workout_session_tenant_all ON "WorkoutSession" FOR ALL
  USING ("gymId" = app_current_gym_id())
  WITH CHECK ("gymId" = app_current_gym_id());

CREATE POLICY workout_session_exercise_tenant_all ON "WorkoutSessionExercise" FOR ALL
  USING ("gymId" = app_current_gym_id())
  WITH CHECK ("gymId" = app_current_gym_id());

CREATE POLICY workout_set_log_tenant_all ON "WorkoutSetLog" FOR ALL
  USING ("gymId" = app_current_gym_id())
  WITH CHECK ("gymId" = app_current_gym_id());
