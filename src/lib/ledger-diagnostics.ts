import type { Prisma, PrismaClient } from "@prisma/client";

import { isRlsEnforced, prisma } from "@/lib/prisma";
import type { GymSessionUser } from "@/lib/session";

/** Canonical Firestore gym id after successful local reconciliation (for scenario checks). */
export const RECONCILED_FIRESTORE_GYM_ID = "c76365c49f4d4f75b7de161f3";

export class LedgerPostgresGymMissingError extends Error {
  readonly code = "LEDGER_POSTGRES_GYM_MISSING";

  constructor(
    readonly gymId: string,
    readonly diagnostics?: LedgerCreateDiagnostics,
  ) {
    super(`Postgres Gym row missing for ledger write (gymId=${gymId}).`);
    this.name = "LedgerPostgresGymMissingError";
  }
}

export type PostgresConnectionFingerprint = {
  database: string;
  schema: string;
  role: string;
  configuredHost: string | null;
  serverAddress: string | null;
  serverPort: number | null;
  connectionLabel: "runtime" | "direct" | "reconciliation" | "rls" | "unknown";
  vercelEnv: string | null;
  nodeEnv: string | null;
  useRlsRole: boolean;
};

export type LedgerFailureScenario =
  | "A_different_postgres_database"
  | "B_gym_row_missing_in_connected_database"
  | "C_session_gym_id_differs_from_reconciled_firestore_gym"
  | "D_ledger_uses_gym_id_other_than_session"
  | "none";

export type LedgerCreateDiagnostics = {
  sessionUserId: string;
  sessionGymId: string;
  emailMasked: string | null;
  createdById: string;
  prismaGymId: string;
  ledgerGymIdPassedToCreate: string;
  reconciledFirestoreGymIdExpected: string;
  sessionGymIdMatchesReconciled: boolean;
  ledgerGymIdMatchesSession: boolean;
  postgresGymExists: boolean;
  postgresGymName: string | null;
  postgresUserExists: boolean;
  failureScenario: LedgerFailureScenario;
  connection: PostgresConnectionFingerprint;
};

export function isLedgerDiagnosticsEnabled(): boolean {
  return process.env.LEDGER_DIAGNOSTICS === "true";
}

/** Mask email for logs: o***@gym.test */
export function maskEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  const visible = local.length <= 1 ? "*" : `${local[0]}***`;
  return `${visible}@${domain}`;
}

/** Parse host from a Postgres URL without exposing credentials. */
export function safePostgresHost(databaseUrl: string | undefined): string | null {
  if (!databaseUrl) return null;
  try {
    const parsed = new URL(databaseUrl.replace(/^postgresql:/, "postgres:"));
    return parsed.hostname || null;
  } catch {
    return null;
  }
}

export function resolveConnectionLabel(): PostgresConnectionFingerprint["connectionLabel"] {
  if (isRlsEnforced()) return "rls";
  if (process.env.DATABASE_URL) return "runtime";
  return "unknown";
}

/** Compare logical Postgres identity (pooler vs direct may report different inet_server_addr). */
export function postgresIdentitiesMatch(
  left: PostgresConnectionFingerprint,
  right: PostgresConnectionFingerprint,
): boolean {
  return (
    left.database === right.database &&
    left.schema === right.schema &&
    left.role === right.role
  );
}

export function classifyLedgerFailureScenario(params: {
  sessionGymId: string;
  prismaGymId: string;
  postgresGymExists: boolean;
  reconciledFirestoreGymId?: string;
}): LedgerFailureScenario {
  const expected = params.reconciledFirestoreGymId ?? RECONCILED_FIRESTORE_GYM_ID;

  if (params.sessionGymId !== expected) {
    return "C_session_gym_id_differs_from_reconciled_firestore_gym";
  }
  if (params.prismaGymId !== params.sessionGymId) {
    return "D_ledger_uses_gym_id_other_than_session";
  }
  if (!params.postgresGymExists) {
    return "B_gym_row_missing_in_connected_database";
  }
  return "none";
}

export async function getPostgresConnectionFingerprint(
  client: Pick<PrismaClient, "$queryRaw">,
  params?: {
    connectionLabel?: PostgresConnectionFingerprint["connectionLabel"];
    configuredHost?: string | null;
  },
): Promise<PostgresConnectionFingerprint> {
  const [row] = await client.$queryRaw<
    Array<{
      database: string;
      schema: string;
      role: string;
      server_address: string | null;
      server_port: number | null;
    }>
  >`
    SELECT
      current_database() AS database,
      current_schema() AS schema,
      current_user AS role,
      inet_server_addr()::text AS server_address,
      inet_server_port() AS server_port
  `;

  const connectionLabel = params?.connectionLabel ?? resolveConnectionLabel();
  const configuredHost =
    params?.configuredHost ??
    safePostgresHost(
      isRlsEnforced() ? process.env.DATABASE_URL_RLS : process.env.DATABASE_URL,
    );

  return {
    database: row?.database ?? "unknown",
    schema: row?.schema ?? "unknown",
    role: row?.role ?? "unknown",
    configuredHost,
    serverAddress: row?.server_address ?? null,
    serverPort: row?.server_port ?? null,
    connectionLabel,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    nodeEnv: process.env.NODE_ENV ?? null,
    useRlsRole: isRlsEnforced(),
  };
}

/** Fingerprint for the Prisma singleton used by server actions (Vercel runtime path). */
export async function getRuntimePrismaConnectionFingerprint(): Promise<PostgresConnectionFingerprint> {
  return getPostgresConnectionFingerprint(prisma, {
    connectionLabel: resolveConnectionLabel(),
    configuredHost: safePostgresHost(
      isRlsEnforced() ? process.env.DATABASE_URL_RLS : process.env.DATABASE_URL,
    ),
  });
}

export async function collectLedgerCreateDiagnostics(
  tx: Prisma.TransactionClient,
  user: GymSessionUser,
  params?: { ledgerGymIdPassedToCreate?: string },
): Promise<LedgerCreateDiagnostics> {
  const ledgerGymIdPassedToCreate = params?.ledgerGymIdPassedToCreate ?? user.gymId;

  const [gym, postgresUser, connection] = await Promise.all([
    tx.gym.findUnique({
      where: { id: ledgerGymIdPassedToCreate },
      select: { id: true, name: true },
    }),
    tx.user.findUnique({
      where: { id: user.id },
      select: { id: true },
    }),
    getPostgresConnectionFingerprint(tx, {
      connectionLabel: resolveConnectionLabel(),
      configuredHost: safePostgresHost(
        isRlsEnforced() ? process.env.DATABASE_URL_RLS : process.env.DATABASE_URL,
      ),
    }),
  ]);

  const postgresGymExists = gym !== null;

  return {
    sessionUserId: user.id,
    sessionGymId: user.gymId,
    emailMasked: maskEmail(user.email),
    createdById: user.id,
    prismaGymId: ledgerGymIdPassedToCreate,
    ledgerGymIdPassedToCreate,
    reconciledFirestoreGymIdExpected: RECONCILED_FIRESTORE_GYM_ID,
    sessionGymIdMatchesReconciled: user.gymId === RECONCILED_FIRESTORE_GYM_ID,
    ledgerGymIdMatchesSession: ledgerGymIdPassedToCreate === user.gymId,
    postgresGymExists,
    postgresGymName: gym?.name ?? null,
    postgresUserExists: postgresUser !== null,
    failureScenario: classifyLedgerFailureScenario({
      sessionGymId: user.gymId,
      prismaGymId: ledgerGymIdPassedToCreate,
      postgresGymExists,
    }),
    connection,
  };
}

export type LedgerDiagnosticsLogPayload = {
  database: string;
  schema: string;
  configuredHost: string | null;
  sessionGymId: string;
  ledgerGymIdPassedToCreate: string;
  postgresGymExists: boolean;
  failureScenario: LedgerFailureScenario;
};

export function toLedgerDiagnosticsLogPayload(
  diagnostics: LedgerCreateDiagnostics,
): LedgerDiagnosticsLogPayload {
  return {
    database: diagnostics.connection.database,
    schema: diagnostics.connection.schema,
    configuredHost: diagnostics.connection.configuredHost,
    sessionGymId: diagnostics.sessionGymId,
    ledgerGymIdPassedToCreate: diagnostics.ledgerGymIdPassedToCreate,
    postgresGymExists: diagnostics.postgresGymExists,
    failureScenario: diagnostics.failureScenario,
  };
}

export function formatLedgerCreateDiagnostics(diagnostics: LedgerCreateDiagnostics): string {
  return JSON.stringify(toLedgerDiagnosticsLogPayload(diagnostics), null, 2);
}

export function logLedgerCreateDiagnostics(
  phase: "preflight" | "failure",
  diagnostics: LedgerCreateDiagnostics,
): void {
  console.error(
    `[ledger-diagnostics:${phase}] ${formatLedgerCreateDiagnostics(diagnostics)}`,
  );
}

export async function assertPostgresGymExistsForLedger(
  tx: Prisma.TransactionClient,
  user: GymSessionUser,
  params?: { ledgerGymIdPassedToCreate?: string },
): Promise<void> {
  const diagnostics = await collectLedgerCreateDiagnostics(tx, user, params);

  if (isLedgerDiagnosticsEnabled()) {
    logLedgerCreateDiagnostics("preflight", diagnostics);
  }

  if (!diagnostics.postgresGymExists) {
    if (isLedgerDiagnosticsEnabled()) {
      logLedgerCreateDiagnostics("failure", diagnostics);
    }
    throw new LedgerPostgresGymMissingError(
      diagnostics.ledgerGymIdPassedToCreate,
      diagnostics,
    );
  }
}
