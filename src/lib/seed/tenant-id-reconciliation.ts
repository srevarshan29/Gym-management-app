import { Role } from "@prisma/client";

/** Postgres columns with FK → User.id (from prisma/schema.prisma). All use ON UPDATE CASCADE. */
export const POSTGRES_USER_ID_FOREIGN_KEYS = [
  { model: "Member", field: "trainerId", onDelete: "SetNull" },
  { model: "LedgerTransaction", field: "createdById", onDelete: "SetNull" },
  { model: "Subscription", field: "createdById", onDelete: "SetNull" },
  { model: "Subscription", field: "writtenOffById", onDelete: "SetNull" },
  { model: "Payment", field: "recordedById", onDelete: "SetNull" },
] as const;

/**
 * Every Postgres column scoped by gymId that must reference the canonical Firestore gym id.
 * Prisma FK tables cascade on Gym.id updates; denormalized workout tables are updated manually.
 */
export const POSTGRES_GYM_SCOPED_TABLES = [
  { label: "User", prismaModel: "user", hasForeignKey: true },
  { label: "Member", prismaModel: "member", hasForeignKey: true },
  { label: "Package", prismaModel: "package", hasForeignKey: true },
  { label: "Subscription", prismaModel: "subscription", hasForeignKey: true },
  { label: "Payment", prismaModel: "payment", hasForeignKey: true },
  { label: "Receipt", prismaModel: "receipt", hasForeignKey: true },
  { label: "GymProfile", prismaModel: "gymProfile", hasForeignKey: true },
  { label: "Visitor", prismaModel: "visitor", hasForeignKey: true },
  { label: "Employee", prismaModel: "employee", hasForeignKey: true },
  { label: "GymEvent", prismaModel: "gymEvent", hasForeignKey: true },
  { label: "LedgerTransaction", prismaModel: "ledgerTransaction", hasForeignKey: true },
  { label: "Exercise", prismaModel: "exercise", hasForeignKey: true },
  { label: "WorkoutPlan", prismaModel: "workoutPlan", hasForeignKey: true },
  { label: "WorkoutPlanDay", prismaModel: "workoutPlanDay", hasForeignKey: true },
  { label: "WorkoutPlanExercise", prismaModel: "workoutPlanExercise", hasForeignKey: true },
  { label: "DietPlan", prismaModel: "dietPlan", hasForeignKey: true },
  {
    label: "WorkoutSession",
    prismaModel: null,
    hasForeignKey: false,
    rawTable: "WorkoutSession",
  },
  {
    label: "WorkoutSessionExercise",
    prismaModel: null,
    hasForeignKey: false,
    rawTable: "WorkoutSessionExercise",
  },
  {
    label: "WorkoutSetLog",
    prismaModel: null,
    hasForeignKey: false,
    rawTable: "WorkoutSetLog",
  },
] as const;

export type GymScopedRowCounts = Record<
  (typeof POSTGRES_GYM_SCOPED_TABLES)[number]["label"],
  number
>;

export type FirestoreGymSnapshot = {
  id: string;
  name: string;
  registrationToken: string;
  ownerEmail: string;
};

export type FirestoreStaffSnapshot = {
  id: string;
  email: string;
  gymId: string;
  name: string;
  role: string;
  passwordHash: string;
};

export type PostgresStaffSnapshot = {
  id: string;
  email: string;
  gymId: string | null;
  name: string;
  role: Role;
};

export type GymReconcilePlan = {
  firestoreGymId: string;
  legacyPostgresGymId: string;
  gymName: string;
  registrationToken: string;
  ownerEmail: string;
  targetGymAlreadyExists: boolean;
  strategy: "rekey_gym_primary_key" | "move_rows_to_existing_gym";
  rowCounts: GymScopedRowCounts;
};

export type StaffAlignmentIssue =
  | { kind: "aligned" }
  | { kind: "postgres_user_missing"; email: string }
  | { kind: "user_id_mismatch"; email: string; firestoreUserId: string; postgresUserId: string }
  | {
      kind: "gym_id_mismatch";
      email: string;
      firestoreGymId: string;
      postgresGymId: string | null;
      userIdsAligned: boolean;
    };

export type StaffReconcilePlan = {
  email: string;
  firestoreUserId: string;
  postgresUserId: string;
  firestoreGymId: string;
  postgresGymId: string | null;
  ensureGym: { gymId: string; name: string; registrationToken?: string };
  rekeyUser: boolean;
  updateUserGymIdOnly: boolean;
  foreignKeyUpdates: Array<{
    model: (typeof POSTGRES_USER_ID_FOREIGN_KEYS)[number]["model"];
    field: (typeof POSTGRES_USER_ID_FOREIGN_KEYS)[number]["field"];
  }>;
};

export type TenantReconcileBundle = {
  firestoreGymId: string;
  legacyPostgresGymId: string;
  ownerEmail: string;
  gym: GymReconcilePlan | null;
  staff: StaffReconcilePlan[];
};

export class TenantReconcileCollisionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TenantReconcileCollisionError";
  }
}

export function emptyGymScopedRowCounts(): GymScopedRowCounts {
  return Object.fromEntries(
    POSTGRES_GYM_SCOPED_TABLES.map((table) => [table.label, 0]),
  ) as GymScopedRowCounts;
}

export function sumGymScopedRowCounts(counts: GymScopedRowCounts): number {
  return POSTGRES_GYM_SCOPED_TABLES.reduce(
    (sum, table) => sum + counts[table.label],
    0,
  );
}

export function hasMeaningfulTenantData(counts: GymScopedRowCounts): boolean {
  return (
    counts.Member > 0 ||
    counts.Package > 0 ||
    counts.Subscription > 0 ||
    counts.Payment > 0 ||
    counts.Exercise > 0 ||
    counts.WorkoutPlan > 0 ||
    counts.LedgerTransaction > 0 ||
    counts.Visitor > 0 ||
    counts.Employee > 0
  );
}

/** Compare Firestore auth identity to Postgres mirror row matched by exact email. */
export function analyzeStaffAlignment(params: {
  firestore: FirestoreStaffSnapshot;
  postgres: PostgresStaffSnapshot | null;
}): StaffAlignmentIssue {
  const { firestore, postgres } = params;

  if (!postgres) {
    return { kind: "postgres_user_missing", email: firestore.email };
  }

  if (postgres.email !== firestore.email) {
    throw new Error("Staff alignment compared users with different emails.");
  }

  const userIdsAligned = postgres.id === firestore.id;
  const gymIdsAligned = postgres.gymId === firestore.gymId;

  if (userIdsAligned && gymIdsAligned) {
    return { kind: "aligned" };
  }

  if (!userIdsAligned) {
    return {
      kind: "user_id_mismatch",
      email: firestore.email,
      firestoreUserId: firestore.id,
      postgresUserId: postgres.id,
    };
  }

  return {
    kind: "gym_id_mismatch",
    email: firestore.email,
    firestoreGymId: firestore.gymId,
    postgresGymId: postgres.gymId,
    userIdsAligned: true,
  };
}

export function buildStaffReconcilePlan(params: {
  firestore: FirestoreStaffSnapshot;
  postgres: PostgresStaffSnapshot;
  gymName: string;
  registrationToken?: string;
}): StaffReconcilePlan | null {
  const issue = analyzeStaffAlignment(params);
  if (issue.kind === "aligned") return null;

  const rekeyUser = issue.kind === "user_id_mismatch";
  const updateUserGymIdOnly = issue.kind === "gym_id_mismatch";

  if (!rekeyUser && !updateUserGymIdOnly) return null;

  return {
    email: params.firestore.email,
    firestoreUserId: params.firestore.id,
    postgresUserId: params.postgres.id,
    firestoreGymId: params.firestore.gymId,
    postgresGymId: params.postgres.gymId,
    ensureGym: {
      gymId: params.firestore.gymId,
      name: params.gymName,
      registrationToken: params.registrationToken,
    },
    rekeyUser,
    updateUserGymIdOnly,
    foreignKeyUpdates: rekeyUser
      ? POSTGRES_USER_ID_FOREIGN_KEYS.map(({ model, field }) => ({ model, field }))
      : [],
  };
}

export function buildGymReconcilePlan(params: {
  firestore: FirestoreGymSnapshot;
  legacyPostgresGymId: string;
  rowCounts: GymScopedRowCounts;
  targetGymAlreadyExists: boolean;
}): GymReconcilePlan | null {
  if (params.legacyPostgresGymId === params.firestore.id) {
    return null;
  }

  return {
    firestoreGymId: params.firestore.id,
    legacyPostgresGymId: params.legacyPostgresGymId,
    gymName: params.firestore.name,
    registrationToken: params.firestore.registrationToken,
    ownerEmail: params.firestore.ownerEmail,
    targetGymAlreadyExists: params.targetGymAlreadyExists,
    strategy: params.targetGymAlreadyExists
      ? "move_rows_to_existing_gym"
      : "rekey_gym_primary_key",
    rowCounts: params.rowCounts,
  };
}

export function mapFirestoreStaffRole(role: string): Role {
  switch (role) {
    case "OWNER":
      return Role.OWNER;
    case "ADMIN":
      return Role.ADMIN;
    case "STAFF":
      return Role.STAFF;
    default:
      throw new Error(`Unsupported Firestore staff role for Postgres mirror: ${role}`);
  }
}

export type TenantIdReconcileCliArgs = {
  help: boolean;
  dryRun: boolean;
  applyRequested: boolean;
  confirm: boolean;
};

export class TenantIdReconcileNotConfirmedError extends Error {
  constructor() {
    super(
      "Apply mode requires --apply --confirm. Run with --dry-run first to preview changes.",
    );
    this.name = "TenantIdReconcileNotConfirmedError";
  }
}

export class TenantIdReconcileProductionBlockedError extends Error {
  constructor() {
    super(
      "Apply mode is blocked unless TENANT_ID_RECONCILE_ALLOW_PRODUCTION=true is set.",
    );
    this.name = "TenantIdReconcileProductionBlockedError";
  }
}

export function parseTenantIdReconcileCliArgs(argv: string[]): TenantIdReconcileCliArgs {
  const help = argv.includes("--help") || argv.includes("-h");
  const applyRequested = argv.includes("--apply");
  const confirm = argv.includes("--confirm");
  const dryRunExplicit = argv.includes("--dry-run");
  const dryRun = dryRunExplicit || !applyRequested;

  return { help, dryRun, applyRequested, confirm };
}

export function assertTenantIdReconcileApplyConfirmed(args: TenantIdReconcileCliArgs) {
  if (args.applyRequested && !args.confirm) {
    throw new TenantIdReconcileNotConfirmedError();
  }
}

export function assertTenantIdReconcileApplyEnvironment() {
  if (process.env.TENANT_ID_RECONCILE_ALLOW_PRODUCTION !== "true") {
    throw new TenantIdReconcileProductionBlockedError();
  }
}

export function formatGymScopedRowCounts(counts: GymScopedRowCounts): string {
  return POSTGRES_GYM_SCOPED_TABLES.map(
    (table) => `${table.label}: ${counts[table.label]}`,
  ).join("\n");
}

export function formatTenantReconcileBundle(bundle: TenantReconcileBundle): string {
  const lines = [
    "LEGACY TENANT",
    `  owner email: ${bundle.ownerEmail}`,
    `  Postgres Gym: ${bundle.legacyPostgresGymId}`,
    `  Firestore Gym: ${bundle.firestoreGymId}`,
  ];

  if (bundle.gym) {
    lines.push(`  strategy: ${bundle.gym.strategy}`, "", "ROWS TO MIGRATE");
    for (const table of POSTGRES_GYM_SCOPED_TABLES) {
      lines.push(`  ${table.label}: ${bundle.gym.rowCounts[table.label]}`);
    }
  } else {
    lines.push("", "GYM IDS ALREADY ALIGNED (no gym migration needed)");
  }

  if (bundle.staff.length > 0) {
    lines.push("", "STAFF ID REALIGNMENT");
    for (const plan of bundle.staff) {
      lines.push(`  email: ${plan.email}`);
      lines.push(
        `  postgres user id: ${plan.postgresUserId} → ${plan.firestoreUserId}`,
      );
      if (plan.rekeyUser) {
        lines.push("  re-key Postgres User.id (FK ON UPDATE CASCADE)");
      } else if (plan.updateUserGymIdOnly) {
        lines.push("  update User.gymId only");
      }
    }
  }

  return lines.join("\n");
}

export function formatStaffReconcilePlan(plan: StaffReconcilePlan): string {
  const lines = [
    `  email: ${plan.email}`,
    `  postgres user id: ${plan.postgresUserId} → ${plan.firestoreUserId}`,
    `  postgres gym id: ${plan.postgresGymId ?? "(null)"} → ${plan.firestoreGymId}`,
  ];

  if (plan.rekeyUser) {
    lines.push("  re-key Postgres User.id (FK ON UPDATE CASCADE)");
  } else if (plan.updateUserGymIdOnly) {
    lines.push("  update User.gymId only (user id already aligned)");
  }

  return lines.join("\n");
}
