-- Diet and workout plans assigned to members (one active plan per member).

CREATE TYPE "WorkoutLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

CREATE TABLE "DietPlan" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "caloriesPerDay" INTEGER NOT NULL,
    "mealPlan" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DietPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkoutPlan" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "level" "WorkoutLevel" NOT NULL,
    "weeklySchedule" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutPlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DietPlan_gymId_memberId_key" ON "DietPlan"("gymId", "memberId");
CREATE INDEX "DietPlan_gymId_idx" ON "DietPlan"("gymId");

CREATE UNIQUE INDEX "WorkoutPlan_gymId_memberId_key" ON "WorkoutPlan"("gymId", "memberId");
CREATE INDEX "WorkoutPlan_gymId_idx" ON "WorkoutPlan"("gymId");

ALTER TABLE "DietPlan" ADD CONSTRAINT "DietPlan_gymId_fkey"
  FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DietPlan" ADD CONSTRAINT "DietPlan_memberId_fkey"
  FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkoutPlan" ADD CONSTRAINT "WorkoutPlan_gymId_fkey"
  FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkoutPlan" ADD CONSTRAINT "WorkoutPlan_memberId_fkey"
  FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DietPlan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DietPlan" FORCE ROW LEVEL SECURITY;

ALTER TABLE "WorkoutPlan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkoutPlan" FORCE ROW LEVEL SECURITY;

CREATE POLICY diet_plan_tenant_all ON "DietPlan" FOR ALL
  USING ("gymId" = app_current_gym_id())
  WITH CHECK ("gymId" = app_current_gym_id());

CREATE POLICY workout_plan_tenant_all ON "WorkoutPlan" FOR ALL
  USING ("gymId" = app_current_gym_id())
  WITH CHECK ("gymId" = app_current_gym_id());
