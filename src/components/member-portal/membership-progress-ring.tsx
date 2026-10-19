import { cn } from "@/lib/utils";

type MembershipProgressRingProps = {
  daysRemaining: number;
  planTotalDays: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
};

export function MembershipProgressRing({
  daysRemaining,
  planTotalDays,
  size = 152,
  strokeWidth = 10,
  className,
}: MembershipProgressRingProps) {
  const displayDays = Math.max(0, daysRemaining);
  const safeTotal = Math.max(1, planTotalDays);
  const percentRemaining = Math.min(
    100,
    Math.max(0, (displayDays / safeTotal) * 100),
  );

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - percentRemaining / 100);
  const center = size / 2;

  const ariaLabel = `${displayDays} days left, ${Math.round(percentRemaining)}% of plan remaining`;
  const compact = size <= 72;
  const digitSizeClass =
    displayDays >= 100
      ? compact
        ? "text-sm font-bold"
        : "text-2xl font-bold"
      : displayDays >= 10
        ? compact
          ? "text-lg font-bold"
          : "text-3xl font-bold"
        : compact
          ? "text-xl font-bold"
          : "text-4xl font-bold";

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={ariaLabel}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="shadow-glow transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      <div
        className={cn(
          "pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-1 text-center",
          compact ? "gap-0" : "gap-0.5",
        )}
      >
        <span
          className={cn(
            "font-mono leading-none tracking-tight tabular-nums",
            digitSizeClass,
          )}
        >
          {displayDays}
        </span>
        <span
          className={cn(
            "font-medium leading-tight text-muted-foreground",
            compact ? "text-[8px]" : "text-xs",
          )}
        >
          days left
        </span>
      </div>
    </div>
  );
}
