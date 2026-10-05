import { Suspense } from "react";
import { redirect } from "next/navigation";

import { OperationsReportsDashboard } from "@/components/operations-reports-dashboard";
import { PageHeader } from "@/components/page-header";
import {
  OperationsReportsPageSkeleton,
  ReportsPageSkeleton,
} from "@/components/page-loading-skeletons";
import { ReportsDateRangeFilter } from "@/components/reports-date-range-filter";
import { ReportsLegacyExportsPanel } from "@/components/reports-legacy-exports-panel";
import {
  getReportModuleCounts,
  REPORT_MODULES,
} from "@/lib/reports-export";
import {
  formatReportDateRangeLabel,
  resolveLastMonthRange,
  resolveReportDateRange,
} from "@/lib/operations-reports/date-range";
import { loadOperationsReportDashboard } from "@/lib/operations-reports/queries";
import { canExportReports, canViewFinancials } from "@/lib/permissions";
import { requireGym } from "@/lib/session";

type ReportsPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const user = await requireGym();
  if (!canExportReports(user.role)) {
    redirect("/");
  }

  const params = await searchParams;
  const isOwner = canViewFinancials(user.role);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reports"
        description="Period summaries and CSV exports for your gym."
      />

      <Suspense fallback={<OperationsReportsPageSkeleton />}>
        <ReportsDashboardSection
          gymId={user.gymId}
          isOwner={isOwner}
          searchParams={params}
        />
      </Suspense>

      <Suspense fallback={<ReportsPageSkeleton />}>
        <LegacyExportModules gymId={user.gymId} isOwner={isOwner} />
      </Suspense>
    </div>
  );
}

async function ReportsDashboardSection({
  gymId,
  isOwner,
  searchParams,
}: {
  gymId: string;
  isOwner: boolean;
  searchParams: Record<string, string | undefined>;
}) {
  const resolved = resolveReportDateRange({
    preset: searchParams.preset,
    start: searchParams.start,
    end: searchParams.end,
  });

  const rangeError = resolved.ok ? null : resolved.error;
  const range = resolved.ok ? resolved.range : resolveLastMonthRange();

  const attendancePage = Math.max(1, Number(searchParams.ap) || 1);
  const paymentsPage = Math.max(1, Number(searchParams.pp) || 1);

  const data = await loadOperationsReportDashboard(gymId, range, {
    canViewFinancials: isOwner,
    attendancePage,
    paymentsPage,
  });

  return (
    <div className="space-y-3">
      <ReportsDateRangeFilter
        activePreset={
          (resolved.ok
            ? resolved.range.preset
            : searchParams.preset === "custom"
              ? "custom"
              : "last_month") as import("@/lib/operations-reports/date-range").ReportDatePreset
        }
        rangeLabel={
          resolved.ok ? data.rangeLabel : formatReportDateRangeLabel(range)
        }
        customStart={searchParams.start}
        customEnd={searchParams.end}
        error={rangeError}
      />
      <OperationsReportsDashboard data={data} searchParams={searchParams} />
    </div>
  );
}

async function LegacyExportModules({
  gymId,
  isOwner,
}: {
  gymId: string;
  isOwner: boolean;
}) {
  const counts = await getReportModuleCounts(gymId);

  return (
    <ReportsLegacyExportsPanel
      modules={REPORT_MODULES}
      counts={counts}
      isOwner={isOwner}
    />
  );
}
