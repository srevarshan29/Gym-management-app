-- =============================================================================
-- Member portal schema (Google OAuth era) — idempotent hotfix
-- Adds portal profile fields only (no password / setup token / phoneDigits).
-- Run in Supabase SQL Editor if migrations were partially applied.
-- =============================================================================

BEGIN;

ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "portalEnabledAt" TIMESTAMP(3);
ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "ageYears" INTEGER;
ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "heightCm" INTEGER;
ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "weightKg" DECIMAL(5, 1);

COMMIT;
