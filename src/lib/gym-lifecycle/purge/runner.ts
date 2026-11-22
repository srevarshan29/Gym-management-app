import type { GymPurgePhase, GymPurgeProgress } from "@/lib/firestore/types";
import {
  GYM_PURGE_NEVER_DELETE_COLLECTIONS,
  GYM_TENANT_FIRESTORE_COLLECTIONS,
  type GymTenantInventory,
} from "@/lib/gym-lifecycle/purge/inventory";
import { assertTenantPurgeDestructionEnabled } from "@/lib/gym-lifecycle/purge/config";

export type PurgeRunnerDeps = {
  gymId: string;
  inventory: () => Promise<GymTenantInventory>;
  archiveFinancialRecords: () => Promise<void>;
  deleteFirestoreTenantBatch: (input: {
    collection: string;
    cursor?: string | null;
    limit: number;
  }) => Promise<{ deleted: number; nextCursor: string | null }>;
  deleteSupabaseTenantPrefix: () => Promise<void>;
  deletePostgresTenant: () => Promise<void>;
  deleteGymRootDocuments: () => Promise<void>;
  dryRun?: boolean;
};

export type PurgeRunResult =
  | { status: "completed"; progress: GymPurgeProgress }
  | { status: "advanced"; progress: GymPurgeProgress }
  | { status: "failed"; error: string; progress: GymPurgeProgress };

const PHASE_ORDER: GymPurgePhase[] = [
  "precheck",
  "financial_archive",
  "firestore_tenant",
  "supabase_storage",
  "postgres_tenant",
  "gym_root",
];

function nextPhase(current: GymPurgePhase): GymPurgePhase | null {
  const idx = PHASE_ORDER.indexOf(current);
  if (idx === -1 || idx === PHASE_ORDER.length - 1) return null;
  return PHASE_ORDER[idx + 1]!;
}

export function assertInventoryScopedToGym(
  inventory: GymTenantInventory,
  gymId: string,
): void {
  if (inventory.gymId !== gymId) {
    throw new Error("Inventory gymId does not match purge target.");
  }
}

export function assertNeverDeleteCollectionsSafe(): void {
  const overlap = GYM_TENANT_FIRESTORE_COLLECTIONS.filter((c) =>
    (GYM_PURGE_NEVER_DELETE_COLLECTIONS as readonly string[]).includes(c),
  );
  if (overlap.length > 0) {
    throw new Error(`Purge inventory includes protected collections: ${overlap.join(", ")}`);
  }
}

export async function runPurgePhase(
  progress: GymPurgeProgress,
  deps: PurgeRunnerDeps,
): Promise<PurgeRunResult> {
  if (!deps.dryRun) {
    assertTenantPurgeDestructionEnabled();
  }
  assertNeverDeleteCollectionsSafe();

  const completed = new Set(progress.completedPhases ?? []);
  let phase = progress.phase;

  try {
    if (phase === "precheck") {
      const inventory = await deps.inventory();
      assertInventoryScopedToGym(inventory, deps.gymId);
      completed.add("precheck");
      const upcoming = nextPhase(phase)!;
      return {
        status: "advanced",
        progress: { phase: upcoming, cursor: null, completedPhases: [...completed] },
      };
    }

    if (phase === "financial_archive") {
      if (!deps.dryRun) await deps.archiveFinancialRecords();
      completed.add("financial_archive");
      return {
        status: "advanced",
        progress: {
          phase: "firestore_tenant",
          cursor: progress.cursor ?? GYM_TENANT_FIRESTORE_COLLECTIONS[0] ?? null,
          completedPhases: [...completed],
        },
      };
    }

    if (phase === "firestore_tenant") {
      const cursorRaw = progress.cursor ?? "";
      const [collection, docCursor] = cursorRaw.includes("::")
        ? (cursorRaw.split("::", 2) as [string, string])
        : [cursorRaw || GYM_TENANT_FIRESTORE_COLLECTIONS[0]!, ""];

      if (!collection) {
        completed.add("firestore_tenant");
        return {
          status: "advanced",
          progress: {
            phase: "supabase_storage",
            cursor: null,
            completedPhases: [...completed],
          },
        };
      }

      if (!deps.dryRun) {
        const batch = await deps.deleteFirestoreTenantBatch({
          collection,
          cursor: docCursor || null,
          limit: 200,
        });
        if (batch.nextCursor) {
          return {
            status: "advanced",
            progress: {
              phase: "firestore_tenant",
              cursor: `${collection}::${batch.nextCursor}`,
              completedPhases: [...completed],
            },
          };
        }
      }

      const idx = GYM_TENANT_FIRESTORE_COLLECTIONS.indexOf(
        collection as (typeof GYM_TENANT_FIRESTORE_COLLECTIONS)[number],
      );
      const nextCollection = idx >= 0 ? GYM_TENANT_FIRESTORE_COLLECTIONS[idx + 1] : undefined;
      if (nextCollection) {
        return {
          status: "advanced",
          progress: {
            phase: "firestore_tenant",
            cursor: nextCollection,
            completedPhases: [...completed],
          },
        };
      }
      completed.add("firestore_tenant");
      return {
        status: "advanced",
        progress: {
          phase: "supabase_storage",
          cursor: null,
          completedPhases: [...completed],
        },
      };
    }

    if (phase === "supabase_storage") {
      if (!deps.dryRun) await deps.deleteSupabaseTenantPrefix();
      completed.add("supabase_storage");
      return {
        status: "advanced",
        progress: {
          phase: "postgres_tenant",
          cursor: null,
          completedPhases: [...completed],
        },
      };
    }

    if (phase === "postgres_tenant") {
      if (!deps.dryRun) await deps.deletePostgresTenant();
      completed.add("postgres_tenant");
      return {
        status: "advanced",
        progress: { phase: "gym_root", cursor: null, completedPhases: [...completed] },
      };
    }

    if (phase === "gym_root") {
      if (!deps.dryRun) await deps.deleteGymRootDocuments();
      completed.add("gym_root");
      return {
        status: "completed",
        progress: { phase: "gym_root", cursor: null, completedPhases: [...completed] },
      };
    }

    return { status: "failed", error: `Unknown purge phase: ${phase}`, progress };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Purge failed.";
    return { status: "failed", error: message, progress };
  }
}

/** Resume-safe: repeated calls advance one step until completed or failed. */
export async function runPurgeUntilIdle(
  initialProgress: GymPurgeProgress,
  deps: PurgeRunnerDeps,
  maxSteps = 50,
): Promise<PurgeRunResult> {
  let progress = initialProgress;
  let last: PurgeRunResult = {
    status: "advanced",
    progress,
  };

  for (let step = 0; step < maxSteps; step++) {
    last = await runPurgePhase(progress, deps);
    progress = last.progress;
    if (last.status === "completed" || last.status === "failed") {
      return last;
    }
  }

  return last;
}