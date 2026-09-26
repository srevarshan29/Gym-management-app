/**
 * One-time reconciliation of legacy Postgres tenant/staff IDs to Firestore auth IDs.
 *
 * Usage:
 *   npm run db:reconcile:tenant-ids
 *   npm run db:reconcile:tenant-ids -- --dry-run
 *   TENANT_ID_RECONCILE_ALLOW_PRODUCTION=true npm run db:reconcile:tenant-ids -- --apply --confirm
 *   TENANT_ID_RECONCILE_ALLOW_PRODUCTION=true npm run db:reconcile:tenant-ids:apply
 *
 * Default: dry-run (no Postgres writes). Apply requires --apply --confirm and
 * TENANT_ID_RECONCILE_ALLOW_PRODUCTION=true.
 */
import { COLLECTIONS } from "../src/lib/firestore/collections";
import { getFirestoreDb } from "../src/lib/firebase/admin";
import { getRepositories, platformContext } from "../src/lib/firestore";
import type { UserDoc } from "../src/lib/firestore/types";
import { createSeedPrismaClient } from "../src/lib/seed/postgres-tenant-mirror";
import {
  applyGymReconcilePlan,
  applyStaffReconcilePlan,
  detectTenantReconcileBundles,
  type ApplyGymReconcileResult,
  type ApplyStaffReconcileResult,
} from "../src/lib/seed/tenant-id-reconciliation-apply";
import {
  assertTenantIdReconcileApplyConfirmed,
  assertTenantIdReconcileApplyEnvironment,
  formatTenantReconcileBundle,
  parseTenantIdReconcileCliArgs,
  resolveTenantIdReconcileCliArgs,
  TenantIdReconcileNotConfirmedError,
  TenantIdReconcileProductionBlockedError,
  type FirestoreGymSnapshot,
  type FirestoreStaffSnapshot,
} from "../src/lib/seed/tenant-id-reconciliation";

async function listFirestoreStaffUsers(): Promise<FirestoreStaffSnapshot[]> {
  const snap = await getFirestoreDb().collection(COLLECTIONS.users).get();
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as UserDoc) }))
    .filter((u) => u.role !== "SUPER_ADMIN" && u.gymId)
    .map((u) => ({
      id: u.id,
      email: u.email,
      gymId: u.gymId!,
      name: u.name,
      role: u.role,
      passwordHash: u.passwordHash,
    }));
}

async function listFirestoreGyms(): Promise<FirestoreGymSnapshot[]> {
  const { gyms, users } = getRepositories();
  const snap = await getFirestoreDb().collection(COLLECTIONS.gyms).get();

  const results: FirestoreGymSnapshot[] = [];
  for (const doc of snap.docs) {
    const owner = await users.findOwnerByGym(platformContext, doc.id);
    if (!owner) continue;
    const gym = await gyms.getById(platformContext, doc.id);
    if (!gym) continue;
    results.push({
      id: doc.id,
      name: gym.name,
      registrationToken: gym.registrationToken,
      ownerEmail: owner.email,
    });
  }
  return results;
}

function formatGymApplyResult(result: ApplyGymReconcileResult): string {
  if (result.dryRun || !result.denormalizedUpdates) {
    return "  gym migration planned";
  }
  const d = result.denormalizedUpdates;
  return [
    "  gym migration applied",
    `    WorkoutSession.gymId: ${d.workoutSessionRows}`,
    `    WorkoutSessionExercise.gymId: ${d.workoutSessionExerciseRows}`,
    `    WorkoutSetLog.gymId: ${d.workoutSetLogRows}`,
  ].join("\n");
}

function formatStaffApplyResult(result: ApplyStaffReconcileResult): string {
  const fk = result.foreignKeyUpdates;
  if (!fk) return "  staff realignment planned";
  return [
    "  staff realignment applied (User.id ON UPDATE CASCADE):",
    `    Member.trainerId: ${fk.memberTrainerRows}`,
    `    LedgerTransaction.createdById: ${fk.ledgerRows}`,
    `    Subscription.createdById: ${fk.subscriptionCreatedByRows}`,
    `    Subscription.writtenOffById: ${fk.subscriptionWrittenOffByRows}`,
    `    Payment.recordedById: ${fk.paymentRecordedByRows}`,
  ].join("\n");
}

async function main() {
  const args = resolveTenantIdReconcileCliArgs();

  if (args.help) {
    console.log(`Usage: npm run db:reconcile:tenant-ids [--dry-run] [--apply --confirm]
       npm run db:reconcile:tenant-ids:apply

Detects legacy Postgres tenants whose owner email matches Firestore auth but whose
Postgres Gym.id and/or User.id differ from the Firestore session identity.

Options:
  --dry-run   Preview planned changes without writing (default)
  --apply     Apply reconciliation (requires --confirm)
  --confirm   Explicit safeguard for apply mode
  --help      Show this help text

Apply safeguards:
  - Apply never runs by default.
  - Apply is blocked unless TENANT_ID_RECONCILE_ALLOW_PRODUCTION=true.
  - Firestore users/gyms are never modified or deleted.
  - Safe to re-run: aligned tenants are skipped.

Windows note: if "npm run ... -- --apply --confirm" still shows dry-run, use:
  npm run db:reconcile:tenant-ids:apply
  or set TENANT_ID_RECONCILE_APPLY=true and TENANT_ID_RECONCILE_CONFIRM=true.

Fresh deployments should continue using:
  npm run db:seed
  npm run db:seed:firestore
`);
    process.exit(0);
  }

  try {
    if (args.applyRequested) {
      assertTenantIdReconcileApplyConfirmed(args);
      assertTenantIdReconcileApplyEnvironment();
    }

    console.log(
      args.dryRun
        ? "Mode: dry-run (no Postgres writes)"
        : "Mode: APPLY (Postgres writes enabled)",
    );
    console.log("");

    const prisma = createSeedPrismaClient();

    try {
      const [firestoreGyms, firestoreStaff] = await Promise.all([
        listFirestoreGyms(),
        listFirestoreStaffUsers(),
      ]);

      const bundles = await detectTenantReconcileBundles({
        prisma,
        firestoreGyms,
        firestoreStaff,
      });

      if (bundles.length === 0) {
        console.log(
          args.dryRun
            ? "No legacy Firestore/Postgres tenant ID mismatches detected."
            : "No legacy mismatches to reconcile.",
        );
        process.exit(0);
      }

      console.log(
        args.dryRun
          ? `Detected ${bundles.length} tenant(s) to reconcile (dry-run):`
          : `Applying reconciliation for ${bundles.length} tenant(s):`,
      );
      console.log("");

      for (const bundle of bundles) {
        console.log(formatTenantReconcileBundle(bundle));
        console.log("");

        if (bundle.gym) {
          const gymResult = await applyGymReconcilePlan(prisma, {
            plan: bundle.gym,
            dryRun: args.dryRun,
          });
          if (!args.dryRun) {
            console.log(formatGymApplyResult(gymResult));
            console.log("");
          }
        }

        for (const staffPlan of bundle.staff) {
          const firestore = firestoreStaff.find((s) => s.email === staffPlan.email);
          if (!firestore) continue;

          const staffResult = await applyStaffReconcilePlan(prisma, {
            plan: staffPlan,
            firestore,
            dryRun: args.dryRun,
          });

          if (!args.dryRun) {
            console.log(formatStaffApplyResult(staffResult));
            console.log("");
          }
        }
      }

      if (args.dryRun) {
        console.log(
          "Dry-run complete. To apply, set TENANT_ID_RECONCILE_ALLOW_PRODUCTION=true and run:",
        );
        console.log("  npm run db:reconcile:tenant-ids -- --apply --confirm");
        console.log("  npm run db:reconcile:tenant-ids:apply");
      } else {
        console.log("Reconciliation complete.");
      }

      process.exit(0);
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    if (
      error instanceof TenantIdReconcileNotConfirmedError ||
      error instanceof TenantIdReconcileProductionBlockedError
    ) {
      console.error(error.message);
      process.exit(2);
    }
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
