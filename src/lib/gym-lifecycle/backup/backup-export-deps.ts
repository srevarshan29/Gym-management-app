import { createPrismaPostgresExportAdapter } from "@/lib/gym-lifecycle/backup/postgres-tenant-export";
import { createSupabaseTenantAssetsLister } from "@/lib/gym-lifecycle/backup/supabase-tenant-assets-lister";
import type { PostgresExportAdapter } from "@/lib/gym-lifecycle/backup/postgres-tenant-export";
import type { SupabaseStorageLister } from "@/lib/gym-lifecycle/backup/supabase-tenant-export";

/** Test-only overrides — never passed through production server actions. */
export type FullBackupTestExportOverrides = {
  postgres: PostgresExportAdapter;
  supabase: SupabaseStorageLister;
};

export type FullBackupExportDepsInput = {
  gymId: string;
  allowProductionIO: boolean;
  /**
   * @deprecated Use `testOverrides` with `allowProductionIO: false` only.
   * Ignored when production I/O is enabled.
   */
  postgres?: PostgresExportAdapter;
  supabase?: SupabaseStorageLister;
  testOverrides?: FullBackupTestExportOverrides;
};

export type FullBackupExportDeps = {
  postgres: PostgresExportAdapter;
  supabase: SupabaseStorageLister;
};

function rejectProductionInjection(input: FullBackupExportDepsInput): void {
  if (input.postgres !== undefined || input.supabase !== undefined) {
    throw new Error(
      "Injected PostgreSQL or Supabase adapters cannot be used when full backup production I/O is enabled.",
    );
  }
}

/**
 * Resolves Postgres + Supabase exporters for a full backup step.
 * Production export never uses silent or injected adapters.
 */
export async function resolveFullBackupExportDeps(
  input: FullBackupExportDepsInput,
): Promise<FullBackupExportDeps> {
  if (input.allowProductionIO) {
    rejectProductionInjection(input);
    if (input.testOverrides) {
      throw new Error("Test export overrides cannot be combined with production I/O.");
    }
    const postgres = await createPrismaPostgresExportAdapter();
    const supabase = await createSupabaseTenantAssetsLister(input.gymId);
    return { postgres, supabase };
  }

  const overrides = input.testOverrides ?? {
    postgres: input.postgres,
    supabase: input.supabase,
  };

  if (!overrides.postgres) {
    throw new Error(
      "PostgreSQL export adapter is required when full backup production I/O is disabled (tests must inject mocks).",
    );
  }
  if (!overrides.supabase) {
    throw new Error(
      "Supabase tenant asset lister is required when full backup production I/O is disabled (tests must inject mocks).",
    );
  }
  return { postgres: overrides.postgres, supabase: overrides.supabase };
}

/** Explicit test entry point — cannot enable production I/O. */
export async function resolveFullBackupExportDepsForTest(
  input: Omit<FullBackupExportDepsInput, "allowProductionIO"> & {
    testOverrides: FullBackupTestExportOverrides;
  },
): Promise<FullBackupExportDeps> {
  return resolveFullBackupExportDeps({
    gymId: input.gymId,
    allowProductionIO: false,
    testOverrides: input.testOverrides,
  });
}