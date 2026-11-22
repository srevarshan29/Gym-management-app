export type TenantWritePathGap = {
  id: string;
  description: string;
  /** When true, gap is documented but does not block purge (e.g. intentional destruction). */
  purgeException?: boolean;
};

/**
 * Remaining write paths that are not guarded by `assertTenantMutationAllowed`.
 * Destructive purge stays blocked while any non-exception gap exists.
 */
export const TENANT_WRITE_PATH_GAPS: readonly TenantWritePathGap[] = [
  {
    id: "scripts_migrations",
    description:
      "Operator scripts under scripts/ and prisma seed with Admin credentials (out of band).",
    purgeException: true,
  },
  {
    id: "purge_deletion_runners",
    description: "Intentional tenant destruction during verified purge.",
    purgeException: true,
  },
  {
    id: "external_device_webhooks",
    description:
      "Future ZKTeco / payment webhook integrations — not present as write entry points in this repo yet.",
  },
];

export function evaluateTenantWriteCoverageForPurge(): { ok: true } | { ok: false; reason: string } {
  const blocking = TENANT_WRITE_PATH_GAPS.filter((g) => !g.purgeException);
  if (blocking.length === 0) return { ok: true };
  return {
    ok: false,
    reason: `Tenant write guard gaps remain: ${blocking.map((g) => g.id).join(", ")}.`,
  };
}

/** Categories covered by centralized enforcement in this phase. */
export const TENANT_WRITE_GUARDED_CATEGORIES = [
  "tenant_repository_crud",
  "attendance_check_in",
  "gym_sequence_counters",
  "member_workout_session_completion",
  "staff_member_sessions",
  "registration_qr",
  "cron_with_gym_access_check",
] as const;