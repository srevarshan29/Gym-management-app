# Phase 27B.3A — Dependency map

## A. Required lifecycle and deletion safety (RETAIN)

| Component | Path |
|-----------|------|
| Deletion schedule / reactivate / cancel | `gym-deletion-service.ts`, `deletion-policy.ts`, `deletion-types.ts` |
| Purge authority (no backup gate) | `purge/purge-authority.ts` |
| Purge orchestration, leases, runner | `purge/purge-orchestrator.ts`, `purge/runner.ts`, `purge-job-lease.ts` |
| Tenant delete phases | `purge/firestore-tenant-delete.ts`, `supabase-tenant-delete.ts`, `postgres-tenant-delete.ts` |
| Inventory / scoping | `purge/inventory.ts`, `inventory-builder.ts` |
| Financial archive (policy-gated) | `financial-archive-service.ts`, `financial-export.ts`, `financial-archive-verify.ts` |
| Write guards | `tenant-write-guard.ts`, `tenant-write-policy.ts` |
| Admin transitions | `admin-transitions.ts`, `gym-deletion-confirm.ts` |
| Cron purge route | `app/api/cron/gym-deletion-purge/` |
| Audit | `gym-lifecycle-audit` repository |

## B. Optional downloadable export (NEW / RETAIN utilities)

| Component | Path |
|-----------|------|
| Optional export bundle | `export/gym-data-export.ts` |
| Sanitization | `export/export-sanitize.ts` |
| Short-lived download tokens | `export/export-download-tokens.ts` |
| Reused helpers | `backup/checksum.ts`, `backup/tenant-data-inventory.ts`, `financial-export.ts`, `purge/inventory-builder.ts` |

## C. Obsolete full automated backup (UNWIRE, keep code for reference)

| Component | Path | Action |
|-----------|------|--------|
| Full backup runner / promotion | `backup/tenant-backup-runner.ts`, `full-backup-promotion.ts`, `full-backup-service.ts` | Remove from actions/UI; not required for purge |
| Backup purge verification | `backup/backup-purge-verification.ts`, `backup-read-only-verify.ts` | Not used for deletion auth |
| Backup jobs collection | `gym-tenant-backup-jobs` repo | Unused by purge; retain Firestore collection for legacy rows |
| Flags | `ALLOW_TENANT_FULL_BACKUP_EXPORT` | No longer required for deletion |
| Admin backup readout | `backup/admin-backup-readout.ts` | Remove from admin UI |
| Integrity pipeline tests | `tests/gym-lifecycle-full-backup-phase27b*.test.ts` | Removed in 27B.3A |

## Environment flags after 27B.3A

| Flag | Purpose |
|------|---------|
| `ALLOW_TENANT_GYM_PURGE` | Still required for destructive purge steps |
| `ALLOW_TENANT_GYM_DATA_EXPORT` | Optional export generation (default off) |
| `GYM_FINANCIAL_RETENTION_POLICY` | Documents configured retention before purge archive is "complete" |
| `GYM_TENANT_BACKUP_BUCKET` | Optional export storage when export enabled |