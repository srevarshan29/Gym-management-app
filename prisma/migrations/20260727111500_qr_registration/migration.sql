-- QR registration: gym token + visitor intake fields.

CREATE TYPE "VisitorSource" AS ENUM ('walk_in', 'qr_registration');

ALTER TABLE "Gym"
  ADD COLUMN "registrationToken" TEXT;

UPDATE "Gym"
SET "registrationToken" = gen_random_uuid()::text
WHERE "registrationToken" IS NULL;

ALTER TABLE "Gym"
  ALTER COLUMN "registrationToken" SET NOT NULL;

CREATE UNIQUE INDEX "Gym_registrationToken_key" ON "Gym"("registrationToken");

ALTER TABLE "Visitor"
  ADD COLUMN "email" TEXT,
  ADD COLUMN "gender" "MemberGender",
  ADD COLUMN "source" "VisitorSource" NOT NULL DEFAULT 'walk_in';

CREATE INDEX "Visitor_gymId_source_status_idx" ON "Visitor"("gymId", "source", "status");
