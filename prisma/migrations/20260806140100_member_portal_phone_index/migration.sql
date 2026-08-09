-- Non-unique index for member login lookup (unique constraint removed due to legacy duplicate phones)
CREATE INDEX IF NOT EXISTS "Member_gymId_phoneDigits_idx" ON "Member"("gymId", "phoneDigits");
