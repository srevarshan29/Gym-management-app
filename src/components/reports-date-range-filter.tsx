"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ReportDatePreset } from "@/lib/operations-reports/date-range";
import { cn } from "@/lib/utils";

const PRESETS: { id: ReportDatePreset; label: string }[] = [
  { id: "last_month", label: "Last month" },
  { id: "last_3_months", label: "Last 3 months" },
  { id: "custom", label: "Custom range" },
];

type ReportsDateRangeFilterProps = {
  activePreset: ReportDatePreset;
  rangeLabel: string;
  customStart?: string;
  customEnd?: string;
  error?: string | null;
};

export function ReportsDateRangeFilter({
  activePreset,
  rangeLabel,
  customStart = "",
  customEnd = "",
  error,
}: ReportsDateRangeFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function navigate(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value == null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    params.delete("ap");
    params.delete("pp");
    startTransition(() => {
      router.push(`/operations/reports?${params.toString()}`);
    });
  }

  return (
    <div className="space-y-3 rounded-lg border border-border/40 bg-card/80 p-3 sm:p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Date range</p>
          <p className="text-xs text-muted-foreground">{rangeLabel}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <Button
              key={preset.id}
              type="button"
              size="sm"
              variant={activePreset === preset.id ? "default" : "outline"}
              disabled={pending}
              onClick={() =>
                navigate({
                  preset: preset.id,
                  ...(preset.id !== "custom"
                    ? { start: undefined, end: undefined }
                    : {}),
                })
              }
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      {activePreset === "custom" ? (
        <form
          className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const start = (
              form.elements.namedItem("start") as HTMLInputElement
            ).value;
            const end = (form.elements.namedItem("end") as HTMLInputElement)
              .value;
            navigate({ preset: "custom", start, end });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="report-start">Start date</Label>
            <Input
              id="report-start"
              name="start"
              type="date"
              defaultValue={customStart}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="report-end">End date</Label>
            <Input
              id="report-end"
              name="end"
              type="date"
              defaultValue={customEnd}
              required
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={pending}>
              Apply
            </Button>
          </div>
        </form>
      ) : null}

      {error ? (
        <p className={cn("text-sm text-destructive")} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
