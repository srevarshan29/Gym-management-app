-- Platform-level staff login throttle (not gym-scoped). Used from withPlatformLookup.

CREATE TABLE "StaffLoginThrottle" (
    "key" TEXT NOT NULL,
    "failCount" INTEGER NOT NULL DEFAULT 0,
    "windowEndsAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffLoginThrottle_pkey" PRIMARY KEY ("key")
);

ALTER TABLE "StaffLoginThrottle" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StaffLoginThrottle" FORCE ROW LEVEL SECURITY;

CREATE POLICY staff_login_throttle_platform ON "StaffLoginThrottle" FOR ALL
  USING (app_is_platform_lookup() OR app_is_super_admin())
  WITH CHECK (app_is_platform_lookup() OR app_is_super_admin());

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gym_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON "StaffLoginThrottle" TO gym_app;
  END IF;
END $$;
