import { withTenant } from "@/lib/db-context";
import type { LedgerTransactionType } from "@prisma/client";

export type AccountsSummary = {
  membershipIncome: number;
  manualIncome: number;
  manualExpense: number;
  totalIncome: number;
  totalExpense: number;
  net: number;
};

export async function getLedgerTransactions(gymId: string) {
  return withTenant(gymId, (tx) =>
    tx.ledgerTransaction.findMany({
      where: { gymId },
      orderBy: [{ occurredOn: "desc" }, { createdAt: "desc" }],
    }),
  );
}

export async function getAccountsSummary(gymId: string): Promise<AccountsSummary> {
  return withTenant(gymId, async (tx) => {
    const [ledgerRows, paymentAgg] = await Promise.all([
      tx.ledgerTransaction.findMany({
        where: { gymId },
        select: { type: true, amount: true },
      }),
      tx.payment.aggregate({
        where: { gymId },
        _sum: { amount: true },
      }),
    ]);

    let manualIncome = 0;
    let manualExpense = 0;
    for (const row of ledgerRows) {
      const amount = Number(row.amount);
      if (row.type === "INCOME") manualIncome += amount;
      else manualExpense += amount;
    }

    const membershipIncome = Number(paymentAgg._sum.amount ?? 0);
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
  });
}

export type LedgerTransactionInput = {
  id: string;
  type: LedgerTransactionType;
  category: string;
  amount: number;
  occurredOn: string;
  note: string | null;
};

export function toLedgerTransactionInput(row: {
  id: string;
  type: LedgerTransactionType;
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
