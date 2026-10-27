"use client";

import { memo, useId, useMemo } from "react";

import { usePrefersReducedMotion } from "@/components/member-portal/dashboard/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

const SEGMENT_COUNT = 7;
const SIZE = 148;
const CENTER = SIZE / 2;
const RADIUS = 52;
const STROKE = 11;
const GAP_DEG = 8;
const SEGMENT_DEG = 360 / SEGMENT_COUNT;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type WeeklyActivityRingVisualProps = {
  targetDays: number;
  /** Kept for call-site compatibility; goal editor visuals use target only. */
  visitsThisWeek?: number;
  onSelectTarget?: (days: number) => void;
  interactive?: boolean;
  className?: string;
  /** When false, segment strokes update instantly (e.g. while dragging the slider). */
  smoothSegmentMotion?: boolean;
};

function WeeklyActivityRingVisualInner({
  targetDays,
  visitsThisWeek: _visitsThisWeek = 0,
  onSelectTarget,
  interactive = false,
  className,
  smoothSegmentMotion = true,
}: WeeklyActivityRingVisualProps) {
  const glowFilterId = useId().replace(/:/g, "");
  const reducedMotion = usePrefersReducedMotion();
  const safeTarget = Math.min(7, Math.max(1, Math.round(targetDays)));

  const animateSegments = smoothSegmentMotion && !reducedMotion;
  const segmentMotionClass = animateSegments
    ? "transition-[stroke,opacity] duration-150 ease-out"
    : undefined;

  const segments = useMemo(() => {
    const segmentSpan = SEGMENT_DEG - GAP_DEG;
    return Array.from({ length: SEGMENT_COUNT }, (_, index) => {
      const day = index + 1;
      const start = -90 + index * SEGMENT_DEG + GAP_DEG / 2;
      const arc = (segmentSpan / 360) * CIRCUMFERENCE;
      const offset = (start / 360) * CIRCUMFERENCE;
      const isLit = day <= safeTarget;
      return { day, arc, offset, isLit };
    });
  }, [safeTarget]);

  return (
    <div
      className={cn("relative mx-auto aspect-square w-[8.75rem]", className)}
    >
      <svg
        className="h-full w-full"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
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

        {segments.map(({ day, arc, offset, isLit }) => (
          <circle
            key={day}
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            strokeLinecap="round"
            stroke={isLit ? "hsl(var(--primary))" : "hsl(var(--muted) / 0.55)"}
            strokeDasharray={`${arc} ${CIRCUMFERENCE - arc}`}
            strokeDashoffset={-offset}
            filter={isLit ? `url(#${glowFilterId})` : undefined}
            className={segmentMotionClass}
            opacity={isLit ? 1 : 0.4}
          />
        ))}
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center leading-tight">
        <span
          className={cn(
            "font-bold tabular-nums text-foreground",
            animateSegments && "transition-opacity duration-150 ease-out",
          )}
          style={{
            fontSize: "clamp(1.2rem, 4.2vw, 1.5rem)",
            lineHeight: 1.08,
          }}
        >
          {safeTarget}
        </span>
        <span className="mt-px text-[8px] font-medium tracking-[0.07em] text-muted-foreground">
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

export const WeeklyActivityRingVisual = memo(WeeklyActivityRingVisualInner);
