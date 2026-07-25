-- Fix RLS helper booleans: unset GUCs must read as false, not NULL.
-- NOT NULL in policy WITH CHECK evaluates to NULL and blocks inserts (e.g. User create).

CREATE OR REPLACE FUNCTION app_is_super_admin() RETURNS boolean AS $$
  SELECT COALESCE(current_setting('app.is_super_admin', true), 'false') = 'true';
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app_is_platform_lookup() RETURNS boolean AS $$
  SELECT COALESCE(current_setting('app.platform_lookup', true), 'false') = 'true';
$$ LANGUAGE sql STABLE;
