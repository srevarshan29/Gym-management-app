"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { OperationsReportDataset } from "@/lib/operations-reports/types";
import type { ReportDatePreset } from "@/lib/operations-reports/date-range";

type ReportPeriodDownloadButtonProps = {
  dataset: OperationsReportDataset;
  preset: ReportDatePreset;
  startDateKey?: string;
  endDateKey?: string;
  disabled?: boolean;
  label?: string;
  format?: "csv" | "pdf";
};

export function ReportPeriodDownloadButton({
  dataset,
  preset,
  startDateKey,
  endDateKey,
  disabled,
  label,
  format = "csv",
}: ReportPeriodDownloadButtonProps) {
  const params = new URLSearchParams({ dataset, preset });
  if (format === "pdf") {
    params.set("format", "pdf");
  }
  if (preset === "custom" && startDateKey && endDateKey) {
    params.set("start", startDateKey);
    params.set("end", endDateKey);
  }
  const href = `/operations/reports/download?${params.toString()}`;
  const buttonLabel =
    label ?? (format === "pdf" ? "Export PDF" : "Export CSV");

  if (disabled) {
    return (
      <Button disabled size="sm" variant="outline" className="gap-1 shrink-0">
        <Download className="h-4 w-4" /> {buttonLabel}
      </Button>
    );
  }

  return (
    <Button asChild size="sm" variant="outline" className="gap-1 shrink-0">
      <a href={href} download>
        <Download className="h-4 w-4" /> {buttonLabel}
      </a>
    </Button>
  );
}
