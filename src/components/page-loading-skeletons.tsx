import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";

/** Page title + description bar (Dashboard-style). */
export function PageHeaderSkeleton({ actionWidth = 0 }: { actionWidth?: number }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-2">
        <div className="h-8 w-48 rounded bg-muted" />
        <div className="h-4 w-72 max-w-full rounded bg-muted/80" />
      </div>
      {actionWidth > 0 ? (
        <div
          className="h-9 shrink-0 rounded-md bg-muted"
          style={{ width: actionWidth }}
        />
      ) : null}
    </div>
  );
}

export function TableCardSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4 pt-6">
        <div className="mb-2 flex gap-4 border-b pb-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-3 w-16 rounded bg-muted" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-10 rounded bg-muted/70" />
        ))}
      </CardContent>
    </Card>
  );
}

/** Payments page table-in-card pattern. */
export function PaymentsStyleTableSkeleton({
  showTabs = false,
  rows = 5,
}: {
  showTabs?: boolean;
  rows?: number;
}) {
  return (
    <div className="animate-pulse space-y-4">
      {showTabs ? <div className="h-9 w-48 rounded bg-muted" /> : null}
      <Card>
        <CardHeader>
          <div className="h-5 w-40 rounded bg-muted" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="h-8 rounded bg-muted" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

const kpiCardSkeleton = (
  <Card className="rounded-2xl border-0 bg-card/90 shadow-soft ring-1 ring-border/70">
    <CardContent className="space-y-3 p-5">
      <div className="flex items-center gap-2.5">
        <div className="h-10 w-10 shrink-0 rounded-xl bg-muted" />
        <div className="h-3 w-24 rounded bg-muted" />
      </div>
      <div className="space-y-2">
        <div className="h-8 w-20 rounded bg-muted" />
        <div className="h-3 w-32 rounded bg-muted" />
      </div>
    </CardContent>
  </Card>
);

export function KpiGridSkeleton({
  count,
  className = "mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4",
}: {
  count: number;
  className?: string;
}) {
  return (
    <section className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>{kpiCardSkeleton}</div>
      ))}
    </section>
  );
}

export function ChartCardsSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="rounded-2xl border-0 bg-muted/30">
          <CardHeader>
            <div className="h-5 w-40 rounded bg-muted" />
            <div className="mt-2 h-3 w-56 rounded bg-muted/80" />
          </CardHeader>
          <CardContent>
            <div className="h-[280px] rounded-lg bg-muted/50" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function MembersPageSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <PageHeaderSkeleton actionWidth={128} />
      <div className="h-10 w-full max-w-md rounded-md bg-muted" />
      <TableCardSkeleton rows={8} />
    </div>
  );
}

export function AnalyticsPageSkeleton() {
  return (
    <div className="animate-pulse">
      <PageHeaderSkeleton />
      <KpiGridSkeleton count={4} />
      <ChartCardsSkeleton count={2} />
    </div>
  );
}

export function PtMembersPageSkeleton() {
  return (
    <div className="animate-pulse">
      <PageHeaderSkeleton />
      <KpiGridSkeleton count={2} className="mb-8 grid gap-3 sm:grid-cols-2" />
      <TableCardSkeleton rows={6} />
    </div>
  );
}

export function VisitorsPageSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <PaymentsStyleTableSkeleton rows={6} />
    </div>
  );
}

export function RegisterQrPageSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <Card>
        <CardHeader>
          <div className="h-5 w-36 rounded bg-muted" />
          <div className="mt-2 h-3 w-64 rounded bg-muted/80" />
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="h-40 w-40 rounded-lg bg-muted" />
          <div className="w-full flex-1 space-y-3">
            <div className="h-10 w-full rounded bg-muted" />
            <div className="h-9 w-28 rounded bg-muted" />
          </div>
        </CardContent>
      </Card>
      <div>
        <div className="mb-4 h-6 w-48 rounded bg-muted" />
        <TableCardSkeleton rows={4} />
      </div>
    </div>
  );
}

export function ProgrammePlansPageSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <PaymentsStyleTableSkeleton rows={5} />
    </div>
  );
}

export function RenewalListPageSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-10 w-full max-w-sm rounded-md bg-muted" />
      <TableCardSkeleton rows={6} />
    </div>
  );
}

export function FinancePendingDuesPageSkeleton() {
  return <RenewalListPageSkeleton />;
}

export function FinanceSubscriptionsPageSkeleton() {
  return <KpiGridSkeleton count={3} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" />;
}

export function AccountsFinancePageSkeleton() {
  return (
    <div className="space-y-6">
      <KpiGridSkeleton count={3} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" />
      <div className="h-10 w-full max-w-md rounded-md bg-muted" />
      <TableCardSkeleton rows={6} />
    </div>
  );
}

export function ReportsPageSkeleton() {
  const card = (
    <Card className="rounded-2xl border-0 bg-muted/30 p-5 ring-1 ring-border/70">
      <div className="mb-2 h-5 w-32 rounded bg-muted" />
      <div className="mb-4 h-3 w-full max-w-xs rounded bg-muted/80" />
      <div className="flex items-center justify-between">
        <div className="h-8 w-16 rounded bg-muted" />
        <div className="h-9 w-32 rounded bg-muted" />
      </div>
    </Card>
  );

  return (
    <div className="animate-pulse grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i}>{card}</div>
      ))}
    </div>
  );
}
