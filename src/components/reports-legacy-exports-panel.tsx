"use client";

import { ChevronDown } from "lucide-react";

import { ReportModuleCard } from "@/components/report-module-card";
import type { ReportModuleCounts, ReportModuleMeta } from "@/lib/reports-export";
import { cn } from "@/lib/utils";

type ReportsLegacyExportsPanelProps = {
  modules: ReportModuleMeta[];
  counts: ReportModuleCounts;
  isOwner: boolean;
};

export function ReportsLegacyExportsPanel({
  modules,
  counts,
  isOwner,
}: ReportsLegacyExportsPanelProps) {
  return (
    <details className="group rounded-lg border border-border/40 bg-muted/20">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-sm marker:content-none sm:px-4">
        <div>
          <p className="font-medium text-foreground">Full data exports</p>
          <p className="text-xs text-muted-foreground">
            Complete gym CSV downloads (not limited to the date filter)
          </p>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            "group-open:rotate-180",
          )}
          aria-hidden
        />
      </summary>
      <div className="border-t border-border/40 px-3 pb-3 pt-2 sm:px-4">
        <ul className="divide-y divide-border/40">
          {modules.map((module) => (
            <li key={module.id} className="py-2 first:pt-0 last:pb-0">
              <ReportModuleCard
                module={module}
                count={counts[module.id]}
                canDownload={!module.ownerOnly || isOwner}
                compact
              />
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
