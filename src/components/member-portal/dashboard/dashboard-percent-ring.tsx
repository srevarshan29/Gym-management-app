import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

type DashboardPercentRingProps = {
  percent: number;
  size?: number;
  strokeWidth?: number;
  complete?: boolean;
  className?: string;
  centerLabel?: string;
};

export function DashboardPercentRing({
  percent,
  size = 56,
  strokeWidth = 6,
  complete = false,
  className,
  centerLabel,
}: DashboardPercentRingProps) {
  const safePercent = Math.min(100, Math.max(0, percent));
  const radius = Math.max(0, (size - strokeWidth) / 2);
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - safePercent / 100);
  const center = size / 2;

  return (
    <div
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          className="stroke-muted/50"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          className="stroke-primary transition-[stroke-dashoffset] duration-500 ease-out"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {complete ? (
          <Check className="h-5 w-5 text-primary" strokeWidth={2.5} />
        ) : (
          <span className="text-xs font-bold tabular-nums text-foreground">
            {centerLabel ?? `${Math.round(safePercent)}%`}
          </span>
        )}
      </div>
    </div>
  );
}
