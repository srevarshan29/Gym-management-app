import type { ReportModuleMeta } from "@/lib/reports-export";
import { Download } from "lucide-react";
import { ReportDownloadLink } from "@/components/report-download-link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ReportModuleCardProps = {
  module: ReportModuleMeta;
  count: number;
  canDownload: boolean;
  compact?: boolean;
};

export function ReportModuleCard({
  module,
  count,
  canDownload,
  compact = false,
}: ReportModuleCardProps) {
  const downloadHref = `/operations/reports/download?module=${encodeURIComponent(module.id)}`;

  if (compact) {
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{module.title}</p>
          <p className="truncate text-xs text-muted-foreground">{module.description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="font-mono text-sm tabular-nums text-muted-foreground">
            {count.toLocaleString("en-IN")}
          </span>
          {canDownload ? (
            <ReportDownloadLink href={downloadHref} />
          ) : (
            <Button disabled size="sm" className="gap-1 shrink-0">
              <Download className="h-4 w-4" /> Download CSV
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className="rounded-2xl border-0 bg-card/90 shadow-soft ring-1 ring-border/70 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-lg">{module.title}</CardTitle>
        <CardDescription>{module.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-mono text-2xl font-semibold tabular-nums text-foreground">
            {count}
          </span>{" "}
          record{count === 1 ? "" : "s"}
        </p>
        {canDownload ? (
          <ReportDownloadLink href={downloadHref} />
        ) : (
          <div className="text-right">
            <Button disabled className="gap-1 shrink-0">
              <Download className="h-4 w-4" /> Download CSV
            </Button>
            {module.ownerOnly ? (
              <p className="mt-1 text-xs text-muted-foreground">Owner only</p>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
