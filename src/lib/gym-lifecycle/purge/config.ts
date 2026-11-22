/**
 * Destructive tenant purge is disabled unless explicitly enabled in environment.
 * Backup storage must also be configured (see tenant-backup config).
 */
export function isTenantPurgeDestructionEnabled(): boolean {
  return process.env.ALLOW_TENANT_GYM_PURGE === "true";
}

export class GymPurgeDisabledError extends Error {
  constructor(message = "Tenant gym purge is disabled until backup and purge flags are configured.") {
    super(message);
    this.name = "GymPurgeDisabledError";
  }
}

export function assertTenantPurgeDestructionEnabled(): void {
  if (!isTenantPurgeDestructionEnabled()) {
    throw new GymPurgeDisabledError();
  }
}