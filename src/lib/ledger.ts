import { withTenant } from "@/lib/db-context";
import { getRepositories, platformContext } from "@/lib/firestore";
import type { LedgerTransactionType } from "@/lib/firestore/types";
import type { LedgerTransactionType as PrismaLedgerTransactionType } from "@prisma/client";

export type AccountsSummary = {
  membershipIncome: number;
  manualIncome: number;
  manualExpense: number;
  totalIncome: number;
  totalExpense: number;
  net: number;
};

type LedgerAmountRow = {
  type: LedgerTransactionType | PrismaLedgerTransactionType;
  amount: number | { toString(): string };
};

/** Pure summary builder — membership income is Firestore-only; manual rows are Postgres ledger. */
export function buildAccountsSummary(params: {
  membershipIncome: number;
  ledgerRows: LedgerAmountRow[];
}): AccountsSummary {
  let manualIncome = 0;
  let manualExpense = 0;

  for (const row of params.ledgerRows) {
    const amount = Number(row.amount);
    if (row.type === "INCOME") {
      manualIncome += amount;
    } else {
      manualExpense += amount;
    }
  }

  const membershipIncome = params.membershipIncome;
  const totalIncome = membershipIncome + manualIncome;
  const totalExpense = manualExpense;
  const net = totalIncome - totalExpense;

  return {
    membershipIncome,
    manualIncome,
    manualExpense,
    totalIncome,
    totalExpense,
    net,
  };
}

async function getMembershipPaymentIncome(tenantGymId: string): Promise<number> {
  const { payments } = getRepositories();
  return payments.sumAllPaidByGym(platformContext, tenantGymId);
}

export async function getLedgerTransactions(tenantGymId: string) {
  return withTenant(tenantGymId, (tx) =>
    tx.ledgerTransaction.findMany({
      where: { gymId: tenantGymId },
      orderBy: [{ occurredOn: "desc" }, { createdAt: "desc" }],
    }),
  );
}

export async function getAccountsSummary(
  tenantGymId: string,
): Promise<AccountsSummary> {
  const [ledgerRows, membershipIncome] = await Promise.all([
    getLedgerTransactions(tenantGymId),
    getMembershipPaymentIncome(tenantGymId),
  ]);

  return buildAccountsSummary({ membershipIncome, ledgerRows });
}

export type LedgerTransactionInput = {
  id: string;
  type: PrismaLedgerTransactionType;
  category: string;
  amount: number;
  occurredOn: string;
  note: string | null;
};

export function toLedgerTransactionInput(row: {
  id: string;
  type: PrismaLedgerTransactionType;
  category: string;
  amount: { toString(): string } | number;
  occurredOn: Date;
  note: string | null;
}): LedgerTransactionInput {
  return {
    id: row.id,
    type: row.type,
    category: row.category,
    amount: Number(row.amount),
    occurredOn: row.occurredOn.toISOString(),
    note: row.note,
  };
}
