import { afterEach, describe, expect, it, vi } from "vitest";

import { prepareVerifiedFinancialArchive } from "@/lib/gym-lifecycle/financial-archive-service";
import * as financialVerify from "@/lib/gym-lifecycle/financial-archive-verify";
import * as firestore from "@/lib/firestore";

describe("prepareVerifiedFinancialArchive retention gate (27C.3)", () => {
  const priorPolicy = process.env.GYM_FINANCIAL_RETENTION_POLICY;

  afterEach(() => {
    vi.restoreAllMocks();
    if (priorPolicy === undefined) {
      delete process.env.GYM_FINANCIAL_RETENTION_POLICY;
    } else {
      process.env.GYM_FINANCIAL_RETENTION_POLICY = priorPolicy;
    }
  });

  it("persists exports but rejects confirmation when policy env is unset", async () => {
    delete process.env.GYM_FINANCIAL_RETENTION_POLICY;
    const upsertArchive = vi.fn().mockResolvedValue(undefined);

    vi.spyOn(firestore, "getFirestoreDb").mockReturnValue({} as never);
    vi.spyOn(firestore, "getRepositories").mockReturnValue({
      gyms: {
        getById: async () => ({
          id: "g1",
          name: "Gym",
          backupArtifactRef: null,
        }),
      },
      gymFinancialArchives: { upsertArchive },
    } as never);

    vi.spyOn(financialVerify, "buildVerifiedFinancialArchivePayload").mockResolvedValue({
      payments: [],
      receipts: [],
      ledgerTransactions: [],
      subscriptions: [],
      completeness: {
        payments: true,
        receipts: true,
        ledgerTransactions: true,
        subscriptions: true,
      },
    });
    vi.spyOn(financialVerify, "assertFinancialExportMatchesCounts").mockResolvedValue();

    await expect(prepareVerifiedFinancialArchive("g1")).rejects.toThrow(/retention policy/i);
    expect(upsertArchive).toHaveBeenCalledWith(
      expect.objectContaining({
        retentionPolicyConfigured: false,
        financialArchiveStatus: "incomplete",
      }),
    );
  });

  it("succeeds when GYM_FINANCIAL_RETENTION_POLICY is set", async () => {
    process.env.GYM_FINANCIAL_RETENTION_POLICY = "operator-decision-2026";
    const upsertArchive = vi.fn().mockResolvedValue(undefined);

    vi.spyOn(firestore, "getFirestoreDb").mockReturnValue({} as never);
    vi.spyOn(firestore, "getRepositories").mockReturnValue({
      gyms: {
        getById: async () => ({
          id: "g1",
          name: "Gym",
          backupArtifactRef: null,
        }),
      },
      gymFinancialArchives: { upsertArchive },
    } as never);

    vi.spyOn(financialVerify, "buildVerifiedFinancialArchivePayload").mockResolvedValue({
      payments: [],
      receipts: [],
      ledgerTransactions: [],
      subscriptions: [],
      completeness: {
        payments: true,
        receipts: true,
        ledgerTransactions: true,
        subscriptions: true,
      },
    });
    vi.spyOn(financialVerify, "assertFinancialExportMatchesCounts").mockResolvedValue();

    await expect(prepareVerifiedFinancialArchive("g1")).resolves.toBeUndefined();
    expect(upsertArchive).toHaveBeenCalledWith(
      expect.objectContaining({
        retentionPolicyConfigured: true,
        financialArchiveStatus: "complete",
      }),
    );
  });
});