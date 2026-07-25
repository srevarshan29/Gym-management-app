-- RLS smoke tests — run in Supabase SQL editor after migration + setup-gym-app-role.sql.
-- Uses SET ROLE gym_app so policies apply (postgres bypasses RLS).
--
-- All changes rolled back at the end — safe to run on production data.

BEGIN;

SET ROLE gym_app;

-- ---------------------------------------------------------------------------
-- 1) Tenant scope: should see own gym only
-- ---------------------------------------------------------------------------
SELECT set_config('app.gym_id', 'gym_default_0000000001', true);

SELECT count(*) AS gym_visible FROM "Gym";
-- expect: 1

SELECT count(*) AS members_visible FROM "Member";
-- expect: members for gym_default_0000000001 only

-- ---------------------------------------------------------------------------
-- 2) Cross-tenant blocked
-- ---------------------------------------------------------------------------
SELECT set_config('app.gym_id', 'gym_nonexistent_9999999999', true);

SELECT count(*) AS gym_blocked FROM "Gym";
-- expect: 0

-- ---------------------------------------------------------------------------
-- 3) Super-admin context
-- ---------------------------------------------------------------------------
SELECT set_config('app.gym_id', '', true);
SELECT set_config('app.is_super_admin', 'true', true);

SELECT count(*) AS gyms_super_admin FROM "Gym";
-- expect: >= 1

-- ---------------------------------------------------------------------------
-- 4) Platform lookup (login / email uniqueness)
-- ---------------------------------------------------------------------------
SELECT set_config('app.is_super_admin', 'false', true);
SELECT set_config('app.platform_lookup', 'true', true);

SELECT count(*) AS users_platform_lookup FROM "User" WHERE email = 'owner@gym.test';
-- expect: 1

-- ---------------------------------------------------------------------------
-- 5) Tenant user insert (staff provisioning)
-- ---------------------------------------------------------------------------
SELECT set_config('app.gym_id', 'gym_default_0000000001', true);
SELECT set_config('app.is_super_admin', 'false', true);
SELECT set_config('app.platform_lookup', 'false', true);

-- expect: succeeds (rollback at end)
INSERT INTO "User" ("id", "gymId", "name", "email", "passwordHash", "role", "createdAt", "updatedAt")
VALUES (
  'rls_smoke_user_insert',
  'gym_default_0000000001',
  'RLS Smoke',
  'rls-smoke-insert@test.local',
  'hash',
  'STAFF',
  NOW(),
  NOW()
);

ROLLBACK;
