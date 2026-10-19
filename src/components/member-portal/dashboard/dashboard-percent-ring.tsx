import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

type DashboardPercentRingProps = {
  percent: number;
  size?: number;
  strokeWidth?: number;
  complete?: boolean;
  celebrate?: boolean;
  className?: string;
  centerLabel?: string;
  centerTop?: string;
  centerBottom?: string;
};

export function DashboardPercentRing({
  percent,
  size = 56,
  strokeWidth = 6,
  complete = false,
  celebrate = false,
  className,
  centerLabel,
  centerTop,
  centerBottom,
}: DashboardPercentRingProps) {
  const safePercent = Math.min(100, Math.max(0, percent));
  const radius = Math.max(0, (size - strokeWidth) / 2);
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - safePercent / 100);
  const center = size / 2;

  const showSplitCenter = centerTop != null;
  const showCheck = complete && !showSplitCenter;

  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center",
        celebrate && !complete && "animate-dashboard-ring-pop",
        className,
      )}
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
          className={cn(
            "stroke-primary transition-[stroke-dashoffset] duration-500 ease-out",
            showCheck && celebrate && "animate-dashboard-ring-pop",
          )}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={showCheck ? 0 : dashOffset}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {showCheck ? (
          <Check
            className={cn(
              "h-5 w-5 text-primary",
              celebrate && "animate-dashboard-ring-pop",
            )}
            strokeWidth={2.5}
          />
        ) : showSplitCenter ? (
          <div className="flex flex-col items-center justify-center leading-none">
            <span className="text-base font-bold tabular-nums text-foreground">
              {centerTop}
            </span>
            {centerBottom ? (
              <span className="mt-0.5 text-[10px] font-medium text-muted-foreground">
                {centerBottom}
              </span>
            ) : null}
          </div>
        ) : (
          <span className="text-xs font-bold tabular-nums text-foreground">
            {centerLabel ?? `${Math.round(safePercent)}%`}
          </span>
        )}
      </div>
    </div>
  );
}
