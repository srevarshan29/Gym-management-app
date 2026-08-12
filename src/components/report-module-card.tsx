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
};

export function ReportModuleCard({
  module,
  count,
  canDownload,
}: ReportModuleCardProps) {
  const downloadHref = `/operations/reports/download?module=${encodeURIComponent(module.id)}`;

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
