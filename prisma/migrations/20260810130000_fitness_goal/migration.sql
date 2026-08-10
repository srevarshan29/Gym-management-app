-- Fitness goal + body metrics on visitors (QR signup); fitness goal on members.

CREATE TYPE "FitnessGoal" AS ENUM (
  'WEIGHT_LOSS',
  'MUSCLE_GAIN',
  'GENERAL_FITNESS',
  'STRENGTH_TRAINING',
  'ENDURANCE'
);

ALTER TABLE "Member" ADD COLUMN "fitnessGoal" "FitnessGoal";

ALTER TABLE "Visitor" ADD COLUMN "fitnessGoal" "FitnessGoal";
ALTER TABLE "Visitor" ADD COLUMN "ageYears" INTEGER;
ALTER TABLE "Visitor" ADD COLUMN "heightCm" INTEGER;
ALTER TABLE "Visitor" ADD COLUMN "weightKg" DECIMAL(5, 1);
