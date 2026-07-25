-- Add member gender for profile and avatar fallbacks.

CREATE TYPE "MemberGender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');

ALTER TABLE "Member"
  ADD COLUMN "gender" "MemberGender" NOT NULL DEFAULT 'PREFER_NOT_TO_SAY';
