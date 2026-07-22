-- Row Level Security: multi-tenant isolation at the database layer.
-- App connects as gym_app (no BYPASSRLS) with SET LOCAL session GUCs.
-- Migrations/seeds continue to use DIRECT_URL (postgres).

-- Session helper functions (read GUCs set by the app via set_config)
CREATE OR REPLACE FUNCTION app_current_gym_id() RETURNS text AS $$
  SELECT NULLIF(current_setting('app.gym_id', true), '');
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app_is_super_admin() RETURNS boolean AS $$
  SELECT current_setting('app.is_super_admin', true) = 'true';
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app_is_platform_lookup() RETURNS boolean AS $$
  SELECT current_setting('app.platform_lookup', true) = 'true';
$$ LANGUAGE sql STABLE;

-- Enable + force RLS on all tenant tables
ALTER TABLE "Gym" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Gym" FORCE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Member" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Member" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Package" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Package" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" FORCE ROW LEVEL SECURITY;
ALTER TABLE "GymProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GymProfile" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Receipt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Receipt" FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Gym
-- ---------------------------------------------------------------------------
CREATE POLICY gym_tenant_select ON "Gym" FOR SELECT
  USING ("id" = app_current_gym_id());
CREATE POLICY gym_tenant_update ON "Gym" FOR UPDATE
  USING ("id" = app_current_gym_id())
  WITH CHECK ("id" = app_current_gym_id());
CREATE POLICY gym_super_admin_select ON "Gym" FOR SELECT
  USING (app_is_super_admin());
CREATE POLICY gym_super_admin_insert ON "Gym" FOR INSERT
  WITH CHECK (app_is_super_admin());

-- ---------------------------------------------------------------------------
-- User
-- ---------------------------------------------------------------------------
CREATE POLICY user_select ON "User" FOR SELECT
  USING (
    app_is_platform_lookup()
    OR app_is_super_admin()
    OR "gymId" = app_current_gym_id()
  );
CREATE POLICY user_tenant_insert ON "User" FOR INSERT
  WITH CHECK (
    NOT app_is_super_admin()
    AND "gymId" = app_current_gym_id()
  );
CREATE POLICY user_super_admin_insert ON "User" FOR INSERT
  WITH CHECK (
    app_is_super_admin()
    AND "gymId" IS NOT NULL
  );
CREATE POLICY user_tenant_update ON "User" FOR UPDATE
  USING ("gymId" = app_current_gym_id())
  WITH CHECK ("gymId" = app_current_gym_id());
CREATE POLICY user_tenant_delete ON "User" FOR DELETE
  USING ("gymId" = app_current_gym_id());

-- ---------------------------------------------------------------------------
-- GymProfile
-- ---------------------------------------------------------------------------
CREATE POLICY gym_profile_tenant_all ON "GymProfile" FOR ALL
  USING ("gymId" = app_current_gym_id())
  WITH CHECK ("gymId" = app_current_gym_id());
CREATE POLICY gym_profile_super_admin_insert ON "GymProfile" FOR INSERT
  WITH CHECK (app_is_super_admin());
CREATE POLICY gym_profile_super_admin_select ON "GymProfile" FOR SELECT
  USING (app_is_super_admin());

-- ---------------------------------------------------------------------------
-- Member, Package, Subscription, Payment, Receipt (gymId-scoped)
-- ---------------------------------------------------------------------------
CREATE POLICY member_tenant_all ON "Member" FOR ALL
  USING ("gymId" = app_current_gym_id())
  WITH CHECK ("gymId" = app_current_gym_id());
CREATE POLICY member_super_admin_select ON "Member" FOR SELECT
  USING (app_is_super_admin());

CREATE POLICY package_tenant_all ON "Package" FOR ALL
  USING ("gymId" = app_current_gym_id())
  WITH CHECK ("gymId" = app_current_gym_id());

CREATE POLICY subscription_tenant_all ON "Subscription" FOR ALL
  USING ("gymId" = app_current_gym_id())
  WITH CHECK ("gymId" = app_current_gym_id());

CREATE POLICY payment_tenant_all ON "Payment" FOR ALL
  USING ("gymId" = app_current_gym_id())
  WITH CHECK ("gymId" = app_current_gym_id());

CREATE POLICY receipt_tenant_all ON "Receipt" FOR ALL
  USING ("gymId" = app_current_gym_id())
  WITH CHECK ("gymId" = app_current_gym_id());
