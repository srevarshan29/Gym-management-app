import { nutritionCalorieRingProgress } from "@/lib/nutrition/nutrition-calorie-ring-math";
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
  const { displayCalories, displayTarget, percent } =
    nutritionCalorieRingProgress(calories, targetCalories);

  const radius = Math.max(0, (size - strokeWidth) / 2);
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - percent / 100);
  const center = size / 2;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={
        displayTarget != null
          ? `${displayCalories} of ${displayTarget} calories`
          : `${displayCalories} calories logged`
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
          className="stroke-muted/45"
          strokeWidth={strokeWidth}
        />
        {displayTarget != null ? (
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
        ) : null}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="font-display text-2xl font-bold leading-none tabular-nums">
          {displayCalories}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {displayTarget != null ? `of ${displayTarget} kcal` : "kcal today"}
        </p>
      </div>
    </div>
  );
}
