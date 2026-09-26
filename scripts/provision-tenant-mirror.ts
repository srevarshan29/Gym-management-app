/**
 * Provision an existing Firestore tenant into Postgres (gym + owner mirror only).
 *
 * Usage:
 *   npm run db:provision:tenant -- --gym-id cc729470b49c4701bc3edeb06
 *   TENANT_PROVISION_ALLOW_PRODUCTION=true npm run db:provision:tenant:apply -- --gym-id cc729470b49c4701bc3edeb06
 *
 * Default: dry-run (no Postgres writes).
 * Apply requires --apply --confirm and TENANT_PROVISION_ALLOW_PRODUCTION=true.
 *
 * Does not modify Firestore. Does not copy another tenant's operational data.
 */
import { getRepositories, platformContext } from "../src/lib/firestore";
import {
  assertTenantMirrorProvisionApplyConfirmed,
  assertTenantMirrorProvisionApplyEnvironment,
  createProvisionPrismaClient,
  formatTenantMirrorProvisionInspection,
  provisionTenantMirrorToPostgres,
  resolveTenantMirrorProvisionCliArgs,
  TenantMirrorProvisionBlockedError,
  TenantMirrorProvisionNotConfirmedError,
  TenantMirrorProvisionProductionBlockedError,
} from "../src/lib/seed/provision-tenant-mirror";

async function main() {
  const args = resolveTenantMirrorProvisionCliArgs();

  if (args.help) {
    console.log(`Usage: npm run db:provision:tenant -- --gym-id <firestore-gym-id> [--dry-run]
       TENANT_PROVISION_ALLOW_PRODUCTION=true npm run db:provision:tenant:apply -- --gym-id <firestore-gym-id>

Mirrors an existing Firestore gym + OWNER into Postgres using the same logic as
super-admin gym creation (mirrorTenantStaffToPostgres).

Options:
  --gym-id    Firestore gym id to provision (required)
  --dry-run   Preview without writing (default)
  --apply     Apply provisioning (requires --confirm)
  --confirm   Explicit safeguard for apply mode
  --help      Show this help text

Safeguards:
  - Default is dry-run.
  - Apply is blocked unless TENANT_PROVISION_ALLOW_PRODUCTION=true.
  - Never modifies Firestore.
  - Never copies another tenant's Postgres operational data.
`);
    return;
  }

  if (!args.gymId) {
    throw new TenantMirrorProvisionBlockedError(
      "Missing required --gym-id <firestore-gym-id>.",
    );
  }

  assertTenantMirrorProvisionApplyConfirmed(args);
  if (args.applyRequested) {
    assertTenantMirrorProvisionApplyEnvironment();
  }

  const prisma = createProvisionPrismaClient();
  const { gyms, users } = getRepositories();

  try {
    console.log(`Mode: ${args.dryRun ? "dry-run" : "APPLY"}`);
    console.log(`Target gymId: ${args.gymId}`);
    console.log("");

    const result = await provisionTenantMirrorToPostgres({
      ctx: platformContext,
      prisma,
      gymId: args.gymId,
      gyms,
      users,
      dryRun: args.dryRun,
    });

    console.log(formatTenantMirrorProvisionInspection(result.inspection));
    console.log("");
    console.log(result.message);
    if (result.dryRun && result.inspection.canProvision) {
      console.log(
        `Would create Postgres gym: ${result.gymCreated ? "yes" : "no (upsert only)"}`,
      );
      console.log(`Would create Postgres owner: ${result.ownerCreated ? "yes" : "no"}`);
    }
    if (result.applied) {
      console.log(`Postgres gym created: ${result.gymCreated ? "yes" : "no (upsert only)"}`);
      console.log(`Postgres owner created: ${result.ownerCreated ? "yes" : "no"}`);
      if (result.ownerIdMismatch) {
        console.warn(
          "Warning: Postgres owner email already existed under a legacy id. Manual ledger createdById may still fail until staff IDs align.",
        );
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  if (
    error instanceof TenantMirrorProvisionNotConfirmedError ||
    error instanceof TenantMirrorProvisionProductionBlockedError ||
    error instanceof TenantMirrorProvisionBlockedError
  ) {
    console.error(error.message);
    process.exit(1);
  }
  console.error(error);
  process.exit(1);
});
