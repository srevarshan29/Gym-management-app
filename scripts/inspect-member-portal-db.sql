-- Read-only: Member table columns and indexes vs member_portal migration
SELECT column_name, data_type, udt_name, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'Member'
ORDER BY ordinal_position;

SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'Member'
ORDER BY indexname;

SELECT migration_name, finished_at, rolled_back_at, logs, started_at
FROM "_prisma_migrations"
WHERE migration_name LIKE '%member_portal%'
ORDER BY started_at;
