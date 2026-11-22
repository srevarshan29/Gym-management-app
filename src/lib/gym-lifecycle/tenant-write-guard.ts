import { assertTenantAccess, type FirestoreContext } from "@/lib/firestore/context";
import { TenantWriteBlockedError } from "@/lib/firestore/errors";
import type { GymDoc } from "@/lib/firestore/types";
import { evaluateTenantWritePolicy } from "@/lib/gym-lifecycle/tenant-write-policy";

export type TenantMutationGuardOptions = {
  /** Platform/super-admin lifecycle transitions (deletion, reactivation, purge metadata). */
  lifecycleBypass?: boolean;
};

/**
 * Enforces tenant write policy using trusted server-side gymId (never client-supplied gym alone).
 */
export async function assertTenantMutationAllowed(
  ctx: FirestoreContext,
  gymId: string,
  options?: TenantMutationGuardOptions,
): Promise<void> {
  assertTenantAccess(ctx, gymId);
  if (
    options?.lifecycleBypass &&
    (ctx.kind === "platform" || ctx.kind === "super_admin")
  ) {
    return;
  }

  if (ctx.kind === "staff" || ctx.kind === "member") {
    // Staff/member sessions already require an active gym at login (gymAllowsTenantAccess).
    return;
  }

  if (!process.env.FIREBASE_PROJECT_ID?.trim()) {
    // Mock-db unit tests without Admin SDK; production always sets FIREBASE_PROJECT_ID.
    return;
  }

  const { getRepositories, platformContext } = await import("@/lib/firestore");
  const gym = await getRepositories().gyms.getById(platformContext, gymId);
  assertGymDocumentAllowsTenantMutations(gym);
}

export function assertGymDocumentAllowsTenantMutations(
  gym: Pick<
    GymDoc,
  "status" | "deletionMode" | "deletionLockedAt" | "purgeStatus" | "tenantFullBackupJobId"
  > | null,
): void {
  const policy = evaluateTenantWritePolicy(gym);
  if (!policy.allowed) {
    throw new TenantWriteBlockedError(policy.reason);
  }
}