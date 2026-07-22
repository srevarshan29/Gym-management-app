-- Multi-tenant conversion: introduce Gym as the tenant root, scope every
-- gym-specific table by gymId, add per-gym sequential Member numbers, and
-- move Receipt.number from a global sequence to a per-gym sequence.
--
-- All existing rows are backfilled into a single "Gym #1" tenant so nothing
-- already in the database is lost.

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'SUPER_ADMIN';

-- CreateTable
CREATE TABLE "Gym" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "memberSeq" INTEGER NOT NULL DEFAULT 0,
    "receiptSeq" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gym_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Gym_slug_key" ON "Gym"("slug");

-- Backfill: create Gym #1 for all existing data, reusing the existing
-- GymProfile name (if any) as the tenant name.
INSERT INTO "Gym" ("id", "name", "updatedAt")
VALUES (
  'gym_default_0000000001',
  COALESCE((SELECT "name" FROM "GymProfile" ORDER BY "createdAt" ASC LIMIT 1), 'Gym #1'),
  CURRENT_TIMESTAMP
);

-- AlterTable: User (gymId nullable — only SUPER_ADMIN accounts have no gym)
ALTER TABLE "User" ADD COLUMN "gymId" TEXT;
UPDATE "User" SET "gymId" = 'gym_default_0000000001';
CREATE INDEX "User_gymId_idx" ON "User"("gymId");
ALTER TABLE "User" ADD CONSTRAINT "User_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Package
ALTER TABLE "Package" ADD COLUMN "gymId" TEXT;
UPDATE "Package" SET "gymId" = 'gym_default_0000000001';
ALTER TABLE "Package" ALTER COLUMN "gymId" SET NOT NULL;
CREATE INDEX "Package_gymId_idx" ON "Package"("gymId");
ALTER TABLE "Package" ADD CONSTRAINT "Package_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Member (gymId + per-gym sequential memberNumber)
ALTER TABLE "Member" ADD COLUMN "gymId" TEXT;
ALTER TABLE "Member" ADD COLUMN "memberNumber" INTEGER;
UPDATE "Member" SET "gymId" = 'gym_default_0000000001';

WITH numbered AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "gymId" ORDER BY "createdAt" ASC) AS rn
  FROM "Member"
)
UPDATE "Member" AS m
SET "memberNumber" = numbered.rn
FROM numbered
WHERE m."id" = numbered."id";

ALTER TABLE "Member" ALTER COLUMN "gymId" SET NOT NULL;
ALTER TABLE "Member" ALTER COLUMN "memberNumber" SET NOT NULL;
DROP INDEX IF EXISTS "Member_name_idx";
CREATE INDEX "Member_gymId_name_idx" ON "Member"("gymId", "name");
CREATE UNIQUE INDEX "Member_gymId_memberNumber_key" ON "Member"("gymId", "memberNumber");
ALTER TABLE "Member" ADD CONSTRAINT "Member_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Subscription (derive gymId from its Member)
ALTER TABLE "Subscription" ADD COLUMN "gymId" TEXT;
UPDATE "Subscription" AS s SET "gymId" = m."gymId" FROM "Member" AS m WHERE s."memberId" = m."id";
ALTER TABLE "Subscription" ALTER COLUMN "gymId" SET NOT NULL;
CREATE INDEX "Subscription_gymId_idx" ON "Subscription"("gymId");
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Payment (derive gymId from its Member)
ALTER TABLE "Payment" ADD COLUMN "gymId" TEXT;
UPDATE "Payment" AS p SET "gymId" = m."gymId" FROM "Member" AS m WHERE p."memberId" = m."id";
ALTER TABLE "Payment" ALTER COLUMN "gymId" SET NOT NULL;
CREATE INDEX "Payment_gymId_idx" ON "Payment"("gymId");
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Receipt (derive gymId from its Payment; number becomes per-gym, no longer a global sequence)
ALTER TABLE "Receipt" ADD COLUMN "gymId" TEXT;
UPDATE "Receipt" AS r SET "gymId" = p."gymId" FROM "Payment" AS p WHERE r."paymentId" = p."id";
ALTER TABLE "Receipt" ALTER COLUMN "gymId" SET NOT NULL;
ALTER TABLE "Receipt" ALTER COLUMN "number" DROP DEFAULT;
CREATE UNIQUE INDEX "Receipt_gymId_number_key" ON "Receipt"("gymId", "number");
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: GymProfile (one row per gym now, instead of a single global row)
ALTER TABLE "GymProfile" ADD COLUMN "gymId" TEXT;
UPDATE "GymProfile" SET "gymId" = 'gym_default_0000000001'
WHERE "id" = (SELECT "id" FROM "GymProfile" ORDER BY "createdAt" ASC LIMIT 1);
-- Defensive cleanup: the app only ever created a single GymProfile row, but
-- guard against duplicates so the new unique constraint below can't fail.
DELETE FROM "GymProfile" WHERE "gymId" IS NULL;
ALTER TABLE "GymProfile" ALTER COLUMN "gymId" SET NOT NULL;
CREATE UNIQUE INDEX "GymProfile_gymId_key" ON "GymProfile"("gymId");
ALTER TABLE "GymProfile" ADD CONSTRAINT "GymProfile_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Sync Gym counters so future per-gym sequential numbers continue from the
-- backfilled data instead of restarting at 0.
UPDATE "Gym" AS g
SET "memberSeq" = COALESCE((SELECT MAX("memberNumber") FROM "Member" WHERE "gymId" = g."id"), 0),
    "receiptSeq" = COALESCE((SELECT MAX("number") FROM "Receipt" WHERE "gymId" = g."id"), 0);
