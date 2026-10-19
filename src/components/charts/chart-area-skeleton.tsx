import React from "react";

import { cn } from "@/lib/utils";

/** Placeholder while Recharts bundles load on the client. */
export function ChartAreaSkeleton({
  className,
  heightClassName = "h-[280px]",
}: {
  className?: string;
  heightClassName?: string;
}) {
  return (
    <div
      className={cn(
        "w-full animate-pulse rounded-lg bg-muted/50",
        heightClassName,
        className,
      )}
      aria-hidden
    />
  );
}
