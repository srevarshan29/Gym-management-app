-- Member portal credentials + optional body metrics for future programmes
ALTER TABLE "Member" ADD COLUMN "passwordHash" TEXT;
ALTER TABLE "Member" ADD COLUMN "portalEnabledAt" TIMESTAMP(3);
ALTER TABLE "Member" ADD COLUMN "portalSetupToken" TEXT;
ALTER TABLE "Member" ADD COLUMN "portalSetupTokenExpiresAt" TIMESTAMP(3);
ALTER TABLE "Member" ADD COLUMN "phoneDigits" TEXT;
ALTER TABLE "Member" ADD COLUMN "ageYears" INTEGER;
ALTER TABLE "Member" ADD COLUMN "heightCm" INTEGER;
ALTER TABLE "Member" ADD COLUMN "weightKg" DECIMAL(5,1);

UPDATE "Member"
SET "phoneDigits" = regexp_replace("phone", '[^0-9]', '', 'g')
WHERE "phoneDigits" IS NULL AND "phone" IS NOT NULL;

CREATE UNIQUE INDEX "Member_portalSetupToken_key" ON "Member"("portalSetupToken");
-- phoneDigits uniqueness enforced in app when enabling portal (duplicates may exist in legacy data)
CREATE INDEX "Member_gymId_phoneDigits_idx" ON "Member"("gymId", "phoneDigits");
