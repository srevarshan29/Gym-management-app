import type { GymPurgeProgress } from "@/lib/firestore/types";

/** @deprecated Backup verification is not required for purge (27B.3A+). */
export function assertBackupVerifiedForPurge(): void {
  return;
}

export function initialPurgeProgress(): GymPurgeProgress {
  return { phase: "precheck", cursor: null, completedPhases: [] };
}