# Member portal migration reconciliation

Use this after running `scripts/member-portal-hotfix.sql` in Supabase and verifying with the inspect script.

## 1. Verify database state

From the project root (with `.env` pointing at the same database):

```powershell
npx tsx scripts/inspect-member-portal-db.ts
```

Expected:

- All 8 portal columns: **PRESENT**
- `Member_portalSetupToken_key`: **PRESENT**
- `Member_gymId_phoneDigits_idx`: **PRESENT**
- `Member_gymId_phoneDigits_key`: **MISSING** (old unique index; must not exist)

## 2. Regenerate Prisma Client

Stop the Next.js dev server first (avoids Windows `EPERM` on `query_engine-windows.dll.node`).

```powershell
npx prisma generate
```

## 3. Reconcile `_prisma_migrations`

Your history today (typical):

| `migration_name` | State |
|------------------|--------|
| `20260806140000_member_portal` | Failed row with `rolled_back_at`; second row with `finished_at` from `migrate resolve --applied` |
| `20260806140100_member_portal_phone_index` | Failed apply (`phoneDigits` missing); blocks further deploys |

The hotfix SQL already creates the index from `20260806140100`. Mark that migration as applied **without** re-running its SQL:

```powershell
npx prisma migrate resolve --applied 20260806140100_member_portal_phone_index
```

Do **not** run `migrate resolve` again for `20260806140000` if it already has a row with `finished_at` set.

### If `migrate deploy` still complains about a failed migration

Check status:

```powershell
npx prisma migrate status
```

If the **failed** row for `20260806140100` remains and `resolve --applied` fails (e.g. migration name not found as failed), in Supabase SQL editor inspect:

```sql
SELECT migration_name, finished_at, rolled_back_at, started_at, logs
FROM "_prisma_migrations"
WHERE migration_name LIKE '%member_portal%'
ORDER BY started_at;
```

- For a **stuck failed** `20260806140100` entry after hotfix + resolve: Prisma docs recommend fixing DB then `migrate resolve --applied`. If duplicate rows exist for the same name, contact Prisma troubleshooting or delete only the **failed** row ( `finished_at IS NULL` and `logs` contains the 42703 error ) after confirming hotfix + `--applied` — treat row deletion as last resort on production.

### Optional: remove erroneous unique index if it ever existed

Only if inspect shows `Member_gymId_phoneDigits_key` (should not, given rollback):

```sql
DROP INDEX IF EXISTS "Member_gymId_phoneDigits_key";
```

## 4. Confirm Prisma is clean

```powershell
npx prisma migrate status
```

Expected: no failed migrations; pending none if both member_portal migrations are recorded as applied.

```powershell
npx prisma migrate deploy
```

Expected: **No pending migrations to apply.**

## 5. Smoke test app

```powershell
npm run dev
```

- Staff: open a member profile → enable portal → copy login link; member uses Google on gym login URL.
- Member: login/setup flow if portal enabled.
