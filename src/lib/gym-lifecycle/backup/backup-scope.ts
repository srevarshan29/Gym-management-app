/** Snapshot + counts only — does not authorize destructive purge (Phase 27B.2B: full). */
export type GymBackupScope = "preflight" | "full";

export const GYM_BACKUP_SCOPE_PREFLIGHT: GymBackupScope = "preflight";
export const GYM_BACKUP_SCOPE_FULL: GymBackupScope = "full";