import { cn } from "@/lib/utils";

type NutritionCalorieRingProps = {
  calories: number;
  targetCalories: number | null;
  size?: number;
  strokeWidth?: number;
  className?: string;
};

export function NutritionCalorieRing({
  calories,
  targetCalories,
  size = 132,
  strokeWidth = 10,
  className,
}: NutritionCalorieRingProps) {
  const target = targetCalories != null && targetCalories > 0 ? targetCalories : null;
  const percent =
    target == null ? 0 : Math.min(100, Math.max(0, (calories / target) * 100));

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - percent / 100);
  const center = size / 2;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={
        target != null
          ? `${calories} of ${target} calories`
          : `${calories} calories logged`
      }
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
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/40"
        />
        {target != null ? (
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="text-primary transition-[stroke-dashoffset] duration-500"
          />
        ) : null}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="font-display text-2xl font-bold leading-none">{calories}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {target != null ? `of ${target} kcal` : "kcal today"}
        </p>
      </div>
    </div>
  );
}
