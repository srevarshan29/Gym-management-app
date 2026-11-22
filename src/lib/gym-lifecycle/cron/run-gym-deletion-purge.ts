import { getRepositories, platformContext } from "@/lib/firestore";
import { loadPurgeOperationContext } from "@/lib/gym-lifecycle/purge/purge-context";
import { evaluatePurgeAuthority } from "@/lib/gym-lifecycle/purge/purge-authority";
import { advanceGymPurgeStep } from "@/lib/gym-lifecycle/purge/purge-orchestrator";
import { resolveGymLifecycleStatus } from "@/lib/gym-lifecycle/status";

const SYSTEM_ACTOR = "system:cron:gym-deletion-purge";

export async function runGymDeletionPurgeCronJob(options?: { now?: Date; maxGyms?: number }) {
  const { gyms } = getRepositories();
  const now = options?.now ?? new Date();
  const maxGyms = options?.maxGyms ?? 5;
  const gymDocs = await gyms.listAllForAdmin(platformContext, 200);

  const candidates = gymDocs.filter((g) => {
    const status = g.purgeStatus ?? "none";
    return status === "ready" || status === "purging" || status === "failed";
  });

  const stats = { scanned: gymDocs.length, processed: 0, results: [] as string[] };

  for (const gym of candidates.slice(0, maxGyms)) {
    const ctx = await loadPurgeOperationContext(gym.id);
    if (!ctx?.job) continue;
    const authority = evaluatePurgeAuthority({
      gym: ctx.gym,
      job: ctx.job,
      archive: ctx.archive,
      now,
    });
    if (!authority.ok) {
      stats.results.push(`${gym.id}:skipped:${authority.failures[0] ?? "authority"}`);
      continue;
    }
    if (resolveGymLifecycleStatus(ctx.gym) !== "deactivated") {
      stats.results.push(`${gym.id}:skipped:not_deactivated`);
      continue;
    }
    const result = await advanceGymPurgeStep({
      gymId: gym.id,
      actorUserId: SYSTEM_ACTOR,
      now,
    });
    stats.processed += 1;
    stats.results.push(`${gym.id}:${result.status}`);
  }

  return stats;
}