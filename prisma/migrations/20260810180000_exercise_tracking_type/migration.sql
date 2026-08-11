-- CreateEnum
CREATE TYPE "ExerciseTrackingType" AS ENUM ('WEIGHTED', 'TIME', 'BODYWEIGHT');

-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN "trackingType" "ExerciseTrackingType" NOT NULL DEFAULT 'WEIGHTED';

-- AlterTable
ALTER TABLE "WorkoutPlanExercise" ADD COLUMN "trackingTypeOverride" "ExerciseTrackingType";

-- AlterTable
ALTER TABLE "WorkoutSetLog" ALTER COLUMN "weightKg" DROP NOT NULL;
ALTER TABLE "WorkoutSetLog" ADD COLUMN "durationSeconds" INTEGER;

-- Backfill time-based exercises
UPDATE "Exercise" SET "trackingType" = 'TIME' WHERE "name" = 'Plank';
