-- Member portal: Google OAuth (remove phone+password portal fields)
DROP INDEX IF EXISTS "Member_portalSetupToken_key";
DROP INDEX IF EXISTS "Member_gymId_phoneDigits_idx";
ALTER TABLE "Member" DROP COLUMN IF EXISTS "passwordHash";
ALTER TABLE "Member" DROP COLUMN IF EXISTS "portalSetupToken";
ALTER TABLE "Member" DROP COLUMN IF EXISTS "portalSetupTokenExpiresAt";
ALTER TABLE "Member" DROP COLUMN IF EXISTS "phoneDigits";
