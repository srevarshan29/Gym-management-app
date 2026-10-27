"use client";

import { useId } from "react";

import { usePrefersReducedMotion } from "@/components/member-portal/dashboard/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

const SEGMENT_COUNT = 7;

type WeeklyActivityRingVisualProps = {
  targetDays: number;
  /** Kept for call-site compatibility; goal editor visuals use target only. */
  visitsThisWeek?: number;
  onSelectTarget?: (days: number) => void;
  interactive?: boolean;
  className?: string;
};

export function WeeklyActivityRingVisual({
  targetDays,
  visitsThisWeek: _visitsThisWeek = 0,
  onSelectTarget,
  interactive = false,
  className,
}: WeeklyActivityRingVisualProps) {
  const glowFilterId = useId().replace(/:/g, "");
  const reducedMotion = usePrefersReducedMotion();
  const safeTarget = Math.min(7, Math.max(1, Math.round(targetDays)));

  const size = 148;
  const center = size / 2;
  const radius = 52;
  const stroke = 11;
  const gapDeg = 8;
  const segmentDeg = 360 / SEGMENT_COUNT;

  return (
    <div
      className={cn("relative mx-auto aspect-square w-[8.75rem]", className)}
    >
      <svg
        className="h-full w-full"
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter
            id={glowFilterId}
            x="-40%"
            y="-40%"
            width="180%"
            height="180%"
          >
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="0 0 0 0 0.75  0 0 0 0 1  0 0 0 0 0.2  0 0 0 0.45 0"
              result="glow"
            />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {Array.from({ length: SEGMENT_COUNT }, (_, index) => {
          const day = index + 1;
          const segmentSpan = segmentDeg - gapDeg;
          const start = -90 + index * segmentDeg + gapDeg / 2;
          const isLit = day <= safeTarget;
          const circumference = 2 * Math.PI * radius;
          const arc = (segmentSpan / 360) * circumference;
          const offset = (start / 360) * circumference;

          return (
            <circle
              key={day}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              strokeWidth={stroke}
              strokeLinecap="round"
              stroke={isLit ? "hsl(var(--primary))" : "hsl(var(--muted) / 0.55)"}
              strokeDasharray={`${arc} ${circumference - arc}`}
              strokeDashoffset={-offset}
              filter={isLit ? `url(#${glowFilterId})` : undefined}
              className={cn(
                !reducedMotion && "transition-[stroke,opacity,filter] duration-200 ease-out",
              )}
              opacity={isLit ? 1 : 0.4}
            />
          );
        })}
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center leading-tight">
        <span
          className={cn(
            "font-bold tabular-nums text-foreground",
            !reducedMotion && "transition-all duration-200 ease-out",
          )}
          style={{ fontSize: "clamp(1.35rem, 5vw, 1.75rem)", lineHeight: 1.1 }}
        >
          {safeTarget}
        </span>
        <span className="mt-0.5 text-[8.5px] font-medium tracking-[0.09em] text-muted-foreground">
          DAYS / WEEK
        </span>
      </div>

      {interactive && onSelectTarget ? (
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-0">
          {Array.from({ length: SEGMENT_COUNT }, (_, i) => {
            const day = i + 1;
            return (
              <button
                key={day}
                type="button"
                aria-label={`${day} day weekly goal`}
                className={cn(
                  "col-span-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  i === 0 && "col-start-2 row-start-1",
                  i === 1 && "col-start-3 row-start-1",
                  i === 2 && "col-start-3 row-start-2",
                  i === 3 && "col-start-3 row-start-3",
                  i === 4 && "col-start-2 row-start-3",
                  i === 5 && "col-start-1 row-start-3",
                  i === 6 && "col-start-1 row-start-2",
                )}
                onClick={() => onSelectTarget(day)}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
