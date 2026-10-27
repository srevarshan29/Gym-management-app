"use client";

import { useId, useMemo } from "react";

import { usePrefersReducedMotion } from "@/components/member-portal/dashboard/use-prefers-reduced-motion";
import {
  MEMBER_DAILY_WATER_TARGET_MAX_ML,
  MEMBER_DAILY_WATER_TARGET_MIN_ML,
} from "@/lib/member-portal/member-dashboard-goals";
import { cn } from "@/lib/utils";

/** Maps daily goal (ml) to fill height inside the glass (not today's intake). */
function goalTargetFillPercent(targetMl: number): number {
  const clamped = Math.min(
    MEMBER_DAILY_WATER_TARGET_MAX_ML,
    Math.max(MEMBER_DAILY_WATER_TARGET_MIN_ML, targetMl),
  );
  const span = MEMBER_DAILY_WATER_TARGET_MAX_ML - MEMBER_DAILY_WATER_TARGET_MIN_ML;
  const ratio = (clamped - MEMBER_DAILY_WATER_TARGET_MIN_ML) / span;
  return 12 + ratio * 78;
}

type WaterGoalGlassVisualProps = {
  /** Selected daily goal in ml — drives water level in the glass. */
  targetMl: number;
  className?: string;
};

const GLASS_PATH =
  "M28 18 H52 C58 18 62 22 62 28 V78 C62 92 54 100 40 100 C26 100 18 92 18 78 V28 C18 22 22 18 28 18 Z";

const INNER_TOP = 28;
const INNER_BOTTOM = 98;
const INNER_HEIGHT = INNER_BOTTOM - INNER_TOP;

export function WaterGoalGlassVisual({
  targetMl,
  className,
}: WaterGoalGlassVisualProps) {
  const uid = useId().replace(/:/g, "");
  const clipId = `${uid}-clip`;
  const waterGradientId = `${uid}-water`;
  const glassSheenId = `${uid}-sheen`;

  const reducedMotion = usePrefersReducedMotion();
  const fillPercent = useMemo(() => goalTargetFillPercent(targetMl), [targetMl]);
  const waterHeight = (fillPercent / 100) * INNER_HEIGHT;
  const surfaceY = INNER_BOTTOM - waterHeight;

  const motionClass = cn(!reducedMotion && "transition-all duration-300 ease-out");

  return (
    <div
      className={cn(
        "relative mx-auto flex h-[7.5rem] w-[4.75rem] items-end justify-center",
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 80 112" className="h-full w-full">
        <defs>
          <clipPath id={clipId}>
            <path d={GLASS_PATH} />
          </clipPath>
          <linearGradient id={waterGradientId} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#1E6FA8" stopOpacity="0.95" />
            <stop offset="45%" stopColor="#2B9FD4" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#8EDBFF" stopOpacity="0.98" />
          </linearGradient>
          <linearGradient id={glassSheenId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
            <stop offset="35%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.08" />
          </linearGradient>
        </defs>

        {/* Glass body */}
        <path
          d={GLASS_PATH}
          fill="hsl(var(--muted) / 0.18)"
          stroke="hsl(var(--border) / 0.9)"
          strokeWidth="1.75"
        />

        <g clipPath={`url(#${clipId})`}>
          <rect
            x="16"
            y={surfaceY}
            width="48"
            height={waterHeight + 2}
            fill={`url(#${waterGradientId})`}
            className={motionClass}
          />
          {waterHeight > 6 ? (
            <>
              <ellipse
                cx="40"
                cy={surfaceY}
                rx="21"
                ry="3.2"
                fill="#8EDBFF"
                opacity="0.55"
                className={motionClass}
              />
              <path
                d={`M22 ${surfaceY + 0.8} Q40 ${surfaceY - 1.2} 58 ${surfaceY + 0.8}`}
                fill="none"
                stroke="#E8F7FF"
                strokeWidth="1.25"
                strokeLinecap="round"
                opacity="0.75"
                className={motionClass}
              />
            </>
          ) : null}
        </g>

        {/* Left reflection streak */}
        <path
          d="M26 26 Q24 52 26 78"
          fill="none"
          stroke={`url(#${glassSheenId})`}
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.85"
        />
        {/* Top rim highlight */}
        <path
          d="M30 20 Q40 17 50 20"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.35"
        />
        {/* Right subtle edge */}
        <path
          d="M58 32 V74"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.12"
        />
      </svg>
    </div>
  );
}
