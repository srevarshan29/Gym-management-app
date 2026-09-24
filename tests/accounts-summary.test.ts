import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildAccountsSummary, getAccountsSummary } from "@/lib/ledger";
import { buildMonthlyRevenueTrendFromPayments } from "@/lib/revenue";
import { canManageLedger, canViewFinancials } from "@/lib/permissions";
import { TenantIsolationError } from "@/lib/firestore/errors";

const mockLedgerFindMany = vi.fn();
const mockSumAllPaidByGym = vi.fn();

vi.mock("@/lib/db-context", () => ({
  withTenant: vi.fn(
    async (_gymId: string, fn: (tx: { ledgerTransaction: { findMany: typeof mockLedgerFindMany } }) => unknown) =>
      fn({ ledgerTransaction: { findMany: mockLedgerFindMany } }),
  ),
}));

vi.mock("@/lib/firestore", () => ({
  getRepositories: () => ({
    payments: {
      sumAllPaidByGym: mockSumAllPaidByGym,
    },
  }),
  platformContext: { kind: "platform" },
}));

describe("buildAccountsSummary", () => {
  it("combines Firestore membership income with manual ledger rows without double-counting", () => {
    const summary = buildAccountsSummary({
      membershipIncome: 12_500,
      ledgerRows: [
        { type: "INCOME", amount: 2_000 },
        { type: "EXPENSE", amount: 800 },
      ],
    });

    expect(summary.membershipIncome).toBe(12_500);
    expect(summary.manualIncome).toBe(2_000);
    expect(summary.manualExpense).toBe(800);
    expect(summary.totalIncome).toBe(14_500);
    expect(summary.totalExpense).toBe(800);
    expect(summary.net).toBe(13_700);
  });

  it("handles empty membership income and empty manual ledger safely", () => {
    const summary = buildAccountsSummary({
      membershipIncome: 0,
      ledgerRows: [],
    });

    expect(summary).toEqual({
      membershipIncome: 0,
      manualIncome: 0,
      manualExpense: 0,
      totalIncome: 0,
      totalExpense: 0,
      net: 0,
    });
  });

  it("does not treat membership income as manual ledger income", () => {
    const summary = buildAccountsSummary({
      membershipIncome: 5_000,
      ledgerRows: [{ type: "EXPENSE", amount: 500 }],
    });

    expect(summary.manualIncome).toBe(0);
    expect(summary.totalIncome).toBe(5_000);
    expect(summary.net).toBe(4_500);
  });

  it("treats all logged Firestore payments as realized income (no pending status in model)", () => {
    const summary = buildAccountsSummary({
      membershipIncome: 1_500,
      ledgerRows: [],
    });

    expect(summary.membershipIncome).toBe(1_500);
  });

  it("does not model refunds or reversals because payment docs have no status field", () => {
    const summary = buildAccountsSummary({
      membershipIncome: 2_000,
      ledgerRows: [],
    });

    expect(summary.membershipIncome).toBe(2_000);
    expect(summary.totalIncome).toBe(2_000);
  });
});

describe("getAccountsSummary", () => {
  beforeEach(() => {
    mockLedgerFindMany.mockReset();
    mockSumAllPaidByGym.mockReset();
  });

  it("reads membership income from Firestore and manual rows from Postgres", async () => {
    mockSumAllPaidByGym.mockResolvedValue(9_000);
    mockLedgerFindMany.mockResolvedValue([
      {
        id: "ledger-1",
        gymId: "gym-a",
        type: "EXPENSE",
        category: "Rent",
        amount: 1_200,
        occurredOn: new Date("2026-09-01"),
        note: null,
        createdById: "owner-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const summary = await getAccountsSummary("gym-a");

    expect(mockSumAllPaidByGym).toHaveBeenCalledWith(
      { kind: "platform" },
      "gym-a",
    );
    expect(mockLedgerFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { gymId: "gym-a" } }),
    );
    expect(summary.membershipIncome).toBe(9_000);
    expect(summary.manualExpense).toBe(1_200);
    expect(summary.net).toBe(7_800);
  });

  it("scopes Firestore membership income to the requested gym", async () => {
    mockSumAllPaidByGym.mockImplementation(
      (_ctx: unknown, gymId: string) => {
        if (gymId === "gym-a") return Promise.resolve(3_000);
        return Promise.reject(new TenantIsolationError());
      },
    );
    mockLedgerFindMany.mockResolvedValue([]);

    await expect(getAccountsSummary("gym-a")).resolves.toMatchObject({
      membershipIncome: 3_000,
    });
    await expect(getAccountsSummary("gym-b")).rejects.toBeInstanceOf(
      TenantIsolationError,
    );
  });

  it("keeps manual ledger rows separate from membership income in the summary", async () => {
    mockSumAllPaidByGym.mockResolvedValue(4_000);
    mockLedgerFindMany.mockResolvedValue([
      {
        id: "ledger-income",
        gymId: "gym-a",
        type: "INCOME",
        category: "Merchandise",
        amount: 600,
        occurredOn: new Date("2026-09-01"),
        note: null,
        createdById: "owner-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const summary = await getAccountsSummary("gym-a");

    expect(summary.membershipIncome).toBe(4_000);
    expect(summary.manualIncome).toBe(600);
    expect(summary.totalIncome).toBe(4_600);
  });

  it("uses all-time membership totals (Accounts has no date filter)", async () => {
    mockSumAllPaidByGym.mockResolvedValue(20_000);
    mockLedgerFindMany.mockResolvedValue([]);

    const summary = await getAccountsSummary("gym-a");

    expect(mockSumAllPaidByGym).toHaveBeenCalledWith(
      { kind: "platform" },
      "gym-a",
    );
    expect(summary.membershipIncome).toBe(20_000);
  });
});

describe("dashboard revenue compatibility", () => {
  it("remains unchanged when Accounts uses Firestore membership totals", () => {
    const trend = buildMonthlyRevenueTrendFromPayments(
      [
        { amount: 1_000, paidAt: new Date("2026-09-10T10:00:00.000Z") },
        { amount: 500, paidAt: new Date("2026-08-15T10:00:00.000Z") },
      ],
      6,
      new Date("2026-09-15T12:00:00.000Z"),
    );

    const september = trend.find((point) => point.monthKey === "2026-09");
    const august = trend.find((point) => point.monthKey === "2026-08");

    expect(september?.revenue).toBe(1_000);
    expect(august?.revenue).toBe(500);
  });
});

describe("accounts finance authorization", () => {
  it("keeps Owner-only access to Accounts and manual ledger management", () => {
    expect(canViewFinancials("OWNER")).toBe(true);
    expect(canManageLedger("OWNER")).toBe(true);
    expect(canViewFinancials("ADMIN")).toBe(false);
    expect(canManageLedger("ADMIN")).toBe(false);
    expect(canViewFinancials("STAFF")).toBe(false);
  });
});
