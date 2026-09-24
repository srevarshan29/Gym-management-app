import { describe, expect, it, vi } from "vitest";

import {
  LedgerPostgresGymMissingError,
  RECONCILED_FIRESTORE_GYM_ID,
  assertPostgresGymExistsForLedger,
  classifyLedgerFailureScenario,
  formatLedgerCreateDiagnostics,
  maskEmail,
  postgresIdentitiesMatch,
  safePostgresHost,
} from "@/lib/ledger-diagnostics";

const baseFingerprint = {
  database: "neondb",
  schema: "public",
  role: "neondb_owner",
  configuredHost: "ep-example.neon.tech",
  serverAddress: "127.0.0.1",
  serverPort: 5432,
  connectionLabel: "runtime" as const,
  vercelEnv: null,
  nodeEnv: "test",
  useRlsRole: false,
};

describe("ledger diagnostics", () => {
  it("masks email safely for logs", () => {
    expect(maskEmail("owner@gym.test")).toBe("o***@gym.test");
    expect(maskEmail(null)).toBeNull();
  });

  it("extracts postgres host without credentials", () => {
    expect(
      safePostgresHost(
        "postgresql://user:secret@ep-example.neon.tech/neondb?sslmode=require",
      ),
    ).toBe("ep-example.neon.tech");
  });

  it("compares postgres identities by database/schema/role/server address", () => {
    expect(postgresIdentitiesMatch(baseFingerprint, { ...baseFingerprint })).toBe(true);
    expect(
      postgresIdentitiesMatch(baseFingerprint, {
        ...baseFingerprint,
        database: "otherdb",
      }),
    ).toBe(false);
  });

  it("classifies scenario C when session gym id differs from reconciled id", () => {
    expect(
      classifyLedgerFailureScenario({
        sessionGymId: "other-gym",
        prismaGymId: "other-gym",
        postgresGymExists: false,
      }),
    ).toBe("C_session_gym_id_differs_from_reconciled_firestore_gym");
  });

  it("classifies scenario B when gym row is missing for reconciled session id", () => {
    expect(
      classifyLedgerFailureScenario({
        sessionGymId: RECONCILED_FIRESTORE_GYM_ID,
        prismaGymId: RECONCILED_FIRESTORE_GYM_ID,
        postgresGymExists: false,
      }),
    ).toBe("B_gym_row_missing_in_connected_database");
  });

  it("logs only non-secret diagnostic fields", () => {
    const payload = JSON.parse(
      formatLedgerCreateDiagnostics({
        sessionUserId: "user-id",
        sessionGymId: RECONCILED_FIRESTORE_GYM_ID,
        emailMasked: "o***@gym.test",
        createdById: "user-id",
        prismaGymId: RECONCILED_FIRESTORE_GYM_ID,
        ledgerGymIdPassedToCreate: RECONCILED_FIRESTORE_GYM_ID,
        reconciledFirestoreGymIdExpected: RECONCILED_FIRESTORE_GYM_ID,
        sessionGymIdMatchesReconciled: true,
        ledgerGymIdMatchesSession: true,
        postgresGymExists: false,
        postgresGymName: null,
        postgresUserExists: true,
        failureScenario: "B_gym_row_missing_in_connected_database",
        connection: baseFingerprint,
      }),
    );

    expect(Object.keys(payload).sort()).toEqual([
      "configuredHost",
      "database",
      "failureScenario",
      "ledgerGymIdPassedToCreate",
      "postgresGymExists",
      "schema",
      "sessionGymId",
    ]);
    expect(payload.configuredHost).toBe("ep-example.neon.tech");
    expect(payload).not.toHaveProperty("createdById");
    expect(payload).not.toHaveProperty("emailMasked");
    expect(payload).not.toHaveProperty("role");
  });

  it("throws when Postgres Gym row is missing before ledger create", async () => {
    const tx = {
      gym: {
        findUnique: vi.fn(async () => null),
      },
      user: {
        findUnique: vi.fn(async () => ({ id: "user-id" })),
      },
      $queryRaw: vi.fn(async () => [
        {
          database: "neondb",
          schema: "public",
          role: "neondb_owner",
          server_address: "127.0.0.1",
          server_port: 5432,
        },
      ]),
    };

    await expect(
      assertPostgresGymExistsForLedger(tx as never, {
        id: "firestore-user-id",
        gymId: RECONCILED_FIRESTORE_GYM_ID,
        email: "owner@gym.test",
        role: "OWNER",
      }),
    ).rejects.toBeInstanceOf(LedgerPostgresGymMissingError);
  });

  it("passes preflight when Postgres Gym row exists", async () => {
    const tx = {
      gym: {
        findUnique: vi.fn(async () => ({
          id: RECONCILED_FIRESTORE_GYM_ID,
          name: "Gym",
        })),
      },
      user: {
        findUnique: vi.fn(async () => ({ id: "firestore-user-id" })),
      },
      $queryRaw: vi.fn(async () => [
        {
          database: "neondb",
          schema: "public",
          role: "neondb_owner",
          server_address: "127.0.0.1",
          server_port: 5432,
        },
      ]),
    };

    await expect(
      assertPostgresGymExistsForLedger(tx as never, {
        id: "firestore-user-id",
        gymId: RECONCILED_FIRESTORE_GYM_ID,
        email: "owner@gym.test",
        role: "OWNER",
      }),
    ).resolves.toBeUndefined();
  });
});
