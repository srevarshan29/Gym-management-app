import { type PrismaClient, Role } from "@prisma/client";

import type { GymsRepository, UsersRepository } from "@/lib/firestore/repositories";
import type { FirestoreContext } from "@/lib/firestore/context";
import { maskEmail } from "@/lib/ledger-diagnostics";
import {
  createSeedPrismaClient,
  mirrorTenantStaffToPostgres,
  type PostgresGymMirrorInput,
  type PostgresStaffUserMirrorInput,
} from "@/lib/seed/postgres-tenant-mirror";
import { mapFirestoreStaffRole } from "@/lib/seed/tenant-id-reconciliation";

export type TenantMirrorProvisionInspection = {
  gymId: string;
  firestoreGymExists: boolean;
  firestoreGymName: string | null;
  firestoreRegistrationToken: string | null;
  firestoreOwnerUserId: string | null;
  firestoreOwnerEmailMasked: string | null;
  firestoreOwnerName: string | null;
  postgresGymExists: boolean;
  postgresOwnerExistsById: boolean;
  postgresOwnerExistsByEmail: boolean;
  postgresOwnerIdMismatch: boolean;
  alreadyProvisioned: boolean;
  canProvision: boolean;
  blockReason: string | null;
};

export type TenantMirrorProvisionResult = {
  inspection: TenantMirrorProvisionInspection;
  dryRun: boolean;
  applied: boolean;
  gymCreated: boolean;
  ownerCreated: boolean;
  ownerIdMismatch: boolean;
  message: string;
};

export type TenantMirrorProvisionCliArgs = {
  help: boolean;
  gymId: string | null;
  dryRun: boolean;
  applyRequested: boolean;
  confirm: boolean;
};

export class TenantMirrorProvisionNotConfirmedError extends Error {
  constructor() {
    super(
      "Apply mode requires --apply --confirm. Run without flags first to preview changes.",
    );
    this.name = "TenantMirrorProvisionNotConfirmedError";
  }
}

export class TenantMirrorProvisionProductionBlockedError extends Error {
  constructor() {
    super(
      "Apply mode is blocked unless TENANT_PROVISION_ALLOW_PRODUCTION=true is set.",
    );
    this.name = "TenantMirrorProvisionProductionBlockedError";
  }
}

export class TenantMirrorProvisionBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TenantMirrorProvisionBlockedError";
  }
}

export function parseTenantMirrorProvisionCliArgs(
  argv: string[] = process.argv.slice(2),
  env: NodeJS.ProcessEnv = process.env,
): TenantMirrorProvisionCliArgs {
  const help = argv.includes("--help") || argv.includes("-h");
  const gymIdArg = argv.find((arg, index) => argv[index - 1] === "--gym-id") ?? null;
  const applyRequested =
    argv.includes("--apply") || env.TENANT_PROVISION_APPLY === "true";
  const confirm =
    argv.includes("--confirm") || env.TENANT_PROVISION_CONFIRM === "true";
  const dryRunExplicit = argv.includes("--dry-run");
  const dryRun = dryRunExplicit || !applyRequested;

  return { help, gymId: gymIdArg, dryRun, applyRequested, confirm };
}

export function resolveTenantMirrorProvisionCliArgs(
  env: NodeJS.ProcessEnv = process.env,
): TenantMirrorProvisionCliArgs {
  const userArgs = process.argv.slice(2);
  const parsed = parseTenantMirrorProvisionCliArgs(userArgs, env);

  const hasUserFlag =
    userArgs.includes("--apply") ||
    userArgs.includes("--confirm") ||
    userArgs.includes("--dry-run") ||
    userArgs.includes("--help") ||
    userArgs.includes("-h") ||
    userArgs.includes("--gym-id");

  if (hasUserFlag) return parsed;

  const hasProcessFlag =
    process.argv.includes("--apply") ||
    process.argv.includes("--confirm") ||
    process.argv.includes("--dry-run") ||
    process.argv.includes("--help") ||
    process.argv.includes("-h") ||
    process.argv.includes("--gym-id");

  if (hasProcessFlag) {
    return parseTenantMirrorProvisionCliArgs(process.argv, env);
  }

  return parsed;
}

export function assertTenantMirrorProvisionApplyConfirmed(
  args: TenantMirrorProvisionCliArgs,
) {
  if (args.applyRequested && !args.confirm) {
    throw new TenantMirrorProvisionNotConfirmedError();
  }
}

export function assertTenantMirrorProvisionApplyEnvironment() {
  if (process.env.TENANT_PROVISION_ALLOW_PRODUCTION !== "true") {
    throw new TenantMirrorProvisionProductionBlockedError();
  }
}

export async function loadFirestoreTenantMirrorInputs(params: {
  ctx: FirestoreContext;
  gymId: string;
  gyms: GymsRepository;
  users: UsersRepository;
}): Promise<{
  gym: PostgresGymMirrorInput;
  owner: PostgresStaffUserMirrorInput;
  ownerEmailMasked: string;
}> {
  const gym = await params.gyms.getById(params.ctx, params.gymId);
  if (!gym) {
    throw new TenantMirrorProvisionBlockedError(
      `Firestore gym not found for gymId=${params.gymId}.`,
    );
  }

  const owner = await params.users.findOwnerByGym(params.ctx, params.gymId);
  if (!owner) {
    throw new TenantMirrorProvisionBlockedError(
      `Firestore OWNER not found for gymId=${params.gymId}.`,
    );
  }

  const ownerDoc = await params.users.findById(params.ctx, owner.id);
  if (!ownerDoc || !ownerDoc.gymId) {
    throw new TenantMirrorProvisionBlockedError(
      `Firestore owner user document missing for gymId=${params.gymId}.`,
    );
  }

  if (ownerDoc.gymId !== params.gymId) {
    throw new TenantMirrorProvisionBlockedError(
      `Firestore owner gymId mismatch for owner ${owner.id}.`,
    );
  }

  return {
    gym: {
      gymId: gym.id,
      name: gym.name,
      registrationToken: gym.registrationToken,
    },
    owner: {
      id: ownerDoc.id,
      gymId: ownerDoc.gymId,
      name: ownerDoc.name,
      email: ownerDoc.email,
      passwordHash: ownerDoc.passwordHash,
      role: mapFirestoreStaffRole(ownerDoc.role),
    },
    ownerEmailMasked: maskEmail(ownerDoc.email) ?? "***",
  };
}

export async function inspectTenantMirrorProvision(params: {
  ctx: FirestoreContext;
  prisma: Pick<PrismaClient, "gym" | "user">;
  gymId: string;
  gyms: GymsRepository;
  users: UsersRepository;
}): Promise<TenantMirrorProvisionInspection> {
  const gym = await params.gyms.getById(params.ctx, params.gymId);
  const owner = gym
    ? await params.users.findOwnerByGym(params.ctx, params.gymId)
    : null;
  const ownerDoc = owner ? await params.users.findById(params.ctx, owner.id) : null;

  const [postgresGym, postgresOwnerById, postgresOwnerByEmail] = await Promise.all([
    params.prisma.gym.findUnique({ where: { id: params.gymId } }),
    ownerDoc
      ? params.prisma.user.findUnique({ where: { id: ownerDoc.id } })
      : Promise.resolve(null),
    ownerDoc
      ? params.prisma.user.findUnique({ where: { email: ownerDoc.email } })
      : Promise.resolve(null),
  ]);

  const postgresOwnerIdMismatch = Boolean(
    ownerDoc &&
      postgresOwnerByEmail &&
      postgresOwnerByEmail.id !== ownerDoc.id,
  );

  let blockReason: string | null = null;
  if (!gym) {
    blockReason = "Firestore gym not found.";
  } else if (!ownerDoc) {
    blockReason = "Firestore OWNER not found.";
  } else if (postgresOwnerIdMismatch) {
    blockReason =
      "Postgres user already exists for this owner email under a different id. " +
      "Resolve staff ID alignment before provisioning this tenant.";
  } else if (
    postgresOwnerById &&
    postgresOwnerById.gymId &&
    postgresOwnerById.gymId !== params.gymId
  ) {
    blockReason =
      `Postgres user ${ownerDoc.id} already belongs to gymId=${postgresOwnerById.gymId}.`;
  }

  const alreadyProvisioned = Boolean(
    gym &&
      ownerDoc &&
      postgresGym &&
      postgresOwnerById &&
      postgresOwnerById.id === ownerDoc.id &&
      postgresOwnerById.gymId === params.gymId &&
      !postgresOwnerIdMismatch,
  );

  return {
    gymId: params.gymId,
    firestoreGymExists: gym !== null,
    firestoreGymName: gym?.name ?? null,
    firestoreRegistrationToken: gym?.registrationToken ?? null,
    firestoreOwnerUserId: ownerDoc?.id ?? null,
    firestoreOwnerEmailMasked: ownerDoc ? maskEmail(ownerDoc.email) : null,
    firestoreOwnerName: ownerDoc?.name ?? null,
    postgresGymExists: postgresGym !== null,
    postgresOwnerExistsById: postgresOwnerById !== null,
    postgresOwnerExistsByEmail: postgresOwnerByEmail !== null,
    postgresOwnerIdMismatch,
    alreadyProvisioned,
    canProvision: !blockReason && !alreadyProvisioned,
    blockReason,
  };
}

export function formatTenantMirrorProvisionInspection(
  inspection: TenantMirrorProvisionInspection,
): string {
  return [
    `Gym ID: ${inspection.gymId}`,
    `Firestore gym: ${inspection.firestoreGymExists ? inspection.firestoreGymName : "MISSING"}`,
    `Firestore owner: ${
      inspection.firestoreOwnerUserId
        ? `${inspection.firestoreOwnerName} (${inspection.firestoreOwnerEmailMasked})`
        : "MISSING"
    }`,
    `Postgres gym: ${inspection.postgresGymExists ? "EXISTS" : "MISSING"}`,
    `Postgres owner by id: ${inspection.postgresOwnerExistsById ? "EXISTS" : "MISSING"}`,
    inspection.postgresOwnerIdMismatch
      ? "Postgres owner email collision: EXISTS under different id"
      : null,
    inspection.alreadyProvisioned ? "Status: already provisioned" : null,
    inspection.blockReason ? `Blocked: ${inspection.blockReason}` : null,
    inspection.canProvision ? "Ready to mirror gym + owner into Postgres." : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function provisionTenantMirrorToPostgres(params: {
  ctx: FirestoreContext;
  prisma: PrismaClient;
  gymId: string;
  gyms: GymsRepository;
  users: UsersRepository;
  dryRun: boolean;
}): Promise<TenantMirrorProvisionResult> {
  const inspection = await inspectTenantMirrorProvision(params);

  if (inspection.alreadyProvisioned) {
    return {
      inspection,
      dryRun: params.dryRun,
      applied: false,
      gymCreated: false,
      ownerCreated: false,
      ownerIdMismatch: false,
      message: "Tenant mirror already exists in Postgres. No changes made.",
    };
  }

  if (!inspection.canProvision) {
    throw new TenantMirrorProvisionBlockedError(
      inspection.blockReason ?? "Tenant mirror provisioning is blocked.",
    );
  }

  const mirrorInputs = await loadFirestoreTenantMirrorInputs(params);

  if (params.dryRun) {
    return {
      inspection,
      dryRun: true,
      applied: false,
      gymCreated: !inspection.postgresGymExists,
      ownerCreated: !inspection.postgresOwnerExistsById,
      ownerIdMismatch: false,
      message:
        "Dry-run: would mirror Firestore gym + owner into Postgres via mirrorTenantStaffToPostgres.",
    };
  }

  const mirrorResult = await mirrorTenantStaffToPostgres(params.prisma, {
    gym: mirrorInputs.gym,
    owner: mirrorInputs.owner,
  });

  return {
    inspection,
    dryRun: false,
    applied: true,
    gymCreated: !inspection.postgresGymExists,
    ownerCreated: mirrorResult.created,
    ownerIdMismatch: "idMismatch" in mirrorResult && Boolean(mirrorResult.idMismatch),
    message: "Mirrored Firestore tenant into Postgres for manual ledger FK safety.",
  };
}

/** Convenience for scripts: uses DIRECT_URL when set. */
export function createProvisionPrismaClient(): PrismaClient {
  return createSeedPrismaClient();
}
