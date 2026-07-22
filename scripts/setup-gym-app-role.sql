-- One-time setup: restricted app role for RLS-enforced Prisma queries.
-- Run in Supabase SQL editor as postgres (or via DIRECT_URL superuser).
--
-- 1. Replace '<GYM_APP_PASSWORD>' with a strong secret.
-- 2. Set DATABASE_URL_RLS in .env to the direct connection (port 5432), e.g.:
--    postgresql://gym_app:<password>@db.<project>.supabase.co:5432/postgres?sslmode=require
--    (Supabase pooler port 6543 only accepts postgres.[project-ref] — not gym_app.)
-- 3. Keep DATABASE_URL as postgres until tests pass, then set USE_RLS_ROLE=true.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gym_app') THEN
    CREATE ROLE gym_app LOGIN PASSWORD '<GYM_APP_PASSWORD>';
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO gym_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO gym_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO gym_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO gym_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO gym_app;

-- gym_app must NOT have BYPASSRLS (default for non-superuser roles).
