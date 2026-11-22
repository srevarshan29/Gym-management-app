export function isTenantFullBackupExportEnabled(): boolean {
  return process.env.ALLOW_TENANT_FULL_BACKUP_EXPORT === "true";
}