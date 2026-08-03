import { Suspense } from "react";
import { redirect } from "next/navigation";

import { requireGym } from "@/lib/session";
import { canExportReports, canViewFinancials } from "@/lib/permissions";
import {
  getReportModuleCounts,
  REPORT_MODULES,
  type ReportModuleId,
} from "@/lib/reports-export";
import { PageHeader } from "@/components/page-header";
import { ReportModuleCard } from "@/components/report-module-card";
import { ReportsPageSkeleton } from "@/components/page-loading-skeletons";

export default async function ReportsPage() {
  const user = await requireGym();
  if (!canExportReports(user.role)) {
    redirect("/");
  }

  const isOwner = canViewFinancials(user.role);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Download spreadsheet exports for your gym. Data is scoped to your account only."
      />

      <Suspense fallback={<ReportsPageSkeleton />}>
        <ReportsPageContent gymId={user.gymId} isOwner={isOwner} />
      </Suspense>
    </div>
  );
}

async function ReportsPageContent({
  gymId,
  isOwner,
}: {
  gymId: string;
  isOwner: boolean;
}) {
  const counts = await getReportModuleCounts(gymId);

  return (
    <section
      aria-label="Export modules"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
    >
      {REPORT_MODULES.map((module) => {
        const canDownload = !module.ownerOnly || isOwner;
        return (
          <ReportModuleCard
            key={module.id}
            module={module}
            count={counts[module.id as ReportModuleId]}
            canDownload={canDownload}
          />
        );
      })}
    </section>
  );
}
