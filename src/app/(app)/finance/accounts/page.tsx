import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Landmark, Plus, TrendingDown, TrendingUp } from "lucide-react";

import { requireGym } from "@/lib/session";
import { canViewFinancials } from "@/lib/permissions";
import {
  getAccountsSummary,
  getLedgerTransactions,
  toLedgerTransactionInput,
} from "@/lib/ledger";
import { formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { DashboardStatCard } from "@/components/dashboard-stat-card";
import { LedgerTransactionDialog } from "@/components/ledger-transaction-dialog";
import { LedgerTransactionsList } from "@/components/ledger-transactions-list";
import {
  AccountsFinancePageSkeleton,
} from "@/components/page-loading-skeletons";
import { Button } from "@/components/ui/button";

export default async function AccountsFinancePage() {
  const user = await requireGym();
  if (!canViewFinancials(user.role)) redirect("/");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounts & Finance"
        description="Track business income and expenses. Member subscription payments are included in Income automatically — log rent, salaries, equipment, and other items here."
      >
        <LedgerTransactionDialog
          trigger={
            <Button className="gap-1">
              <Plus className="h-4 w-4" /> Add transaction
            </Button>
          }
        />
      </PageHeader>

      <Suspense
        fallback={
          <div className="animate-pulse space-y-6">
            <AccountsFinancePageSkeleton />
          </div>
        }
      >
        <AccountsFinancePageContent gymId={user.gymId} />
      </Suspense>
    </div>
  );
}

async function AccountsFinancePageContent({ gymId }: { gymId: string }) {
  const [summary, rows] = await Promise.all([
    getAccountsSummary(gymId),
    getLedgerTransactions(gymId),
  ]);

  const transactions = rows.map(toLedgerTransactionInput);

  const incomeHintParts: string[] = [
    `${formatCurrency(summary.membershipIncome)} from member payments`,
  ];
  if (summary.manualIncome > 0) {
    incomeHintParts.push(`${formatCurrency(summary.manualIncome)} other income`);
  } else {
    incomeHintParts.push("no other income logged");
  }
  const incomeHint = incomeHintParts.join(" · ");

  const netTone = summary.net >= 0 ? "green" : "red";

  return (
    <>
      <section
        aria-label="Financial summary"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        <DashboardStatCard
          title="Income"
          value={formatCurrency(summary.totalIncome)}
          hint={incomeHint}
          icon={<TrendingUp className="h-5 w-5" />}
          href="/payments"
          tone="green"
          footerLabel="View member payments"
        />
        <DashboardStatCard
          title="Expense"
          value={formatCurrency(summary.totalExpense)}
          hint="Manual ledger expenses (all time)"
          icon={<TrendingDown className="h-5 w-5" />}
          tone="red"
        />
        <DashboardStatCard
          title="Net"
          value={formatCurrency(summary.net)}
          hint="Income minus expenses (all time)"
          icon={<Landmark className="h-5 w-5" />}
          tone={netTone}
        />
      </section>

      <p className="text-sm text-muted-foreground">
        Avoid logging membership fees here if they are already recorded under
        Payments — that would double-count income in the Net total.
      </p>

      <LedgerTransactionsList transactions={transactions} />
    </>
  );
}
