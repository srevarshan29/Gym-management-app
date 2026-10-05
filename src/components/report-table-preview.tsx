"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

export const REPORT_TABLE_PREVIEW_ROWS = 8;

type ReportTablePreviewProps<T> = {
  rows: T[];
  totalCount: number;
  previewCount?: number;
  rowLabel: string;
  renderTable: (visibleRows: T[]) => React.ReactNode;
  footer?: React.ReactNode;
};

export function ReportTablePreview<T>({
  rows,
  totalCount,
  previewCount = REPORT_TABLE_PREVIEW_ROWS,
  rowLabel,
  renderTable,
  footer,
}: ReportTablePreviewProps<T>) {
  const [expanded, setExpanded] = useState(false);
  const showToggle = totalCount > previewCount;
  const visibleRows =
    expanded || !showToggle ? rows : rows.slice(0, previewCount);

  return (
    <div className="space-y-2">
      {renderTable(visibleRows)}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {showToggle ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-primary"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded
              ? "Show less"
              : `View all (${totalCount.toLocaleString("en-IN")} ${rowLabel})`}
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">
            {totalCount.toLocaleString("en-IN")} {rowLabel}
          </span>
        )}
        {expanded && footer ? <div className="w-full sm:w-auto">{footer}</div> : null}
      </div>
    </div>
  );
}
