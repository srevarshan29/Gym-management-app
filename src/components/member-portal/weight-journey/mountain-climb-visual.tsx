"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  pointOnWeightJourneyTrail,
  weightJourneyTrailPathD,
  WEIGHT_JOURNEY_MILESTONES,
  WEIGHT_JOURNEY_SUMMIT,
  WEIGHT_JOURNEY_TRAIL_START,
  WEIGHT_JOURNEY_VIEWBOX,
} from "@/lib/weight-journey/trail-geometry";

export { pointOnWeightJourneyTrail };

const NEON = "#B6FF00";
const VBW = WEIGHT_JOURNEY_VIEWBOX.w;
const VBH = WEIGHT_JOURNEY_VIEWBOX.h;

type MountainClimbVisualProps = {
  progressPercent: number;
  targetLabel?: string | null;
  startLabel?: string | null;
  className?: string;
};

export function MountainClimbVisual({
  progressPercent,
  targetLabel,
  startLabel,
  className,
}: MountainClimbVisualProps) {
  const trailD = React.useMemo(() => weightJourneyTrailPathD(), []);
  const progress = Math.min(100, Math.max(0, progressPercent));
  const [markerX, markerY] = pointOnWeightJourneyTrail(progress);
  const summit = WEIGHT_JOURNEY_SUMMIT;
  const base = WEIGHT_JOURNEY_TRAIL_START;
  const uid = React.useId().replace(/:/g, "");

  const viewMinY = -WEIGHT_JOURNEY_VIEWBOX.padTop;
  const viewHeight = VBH + WEIGHT_JOURNEY_VIEWBOX.padTop + WEIGHT_JOURNEY_VIEWBOX.padBottom;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-[#0a1210]",
        className,
      )}
    >
      <svg
        viewBox={`0 ${viewMinY} ${VBW} ${viewHeight}`}
        className="aspect-[400/278] h-auto w-full"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Weight journey climbing trail progress"
      >
        <defs>
          <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#121c17" />
            <stop offset="100%" stopColor="#0a100d" />
          </linearGradient>
          <linearGradient id={`${uid}-hill-back`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#24382e" />
            <stop offset="100%" stopColor="#1a2821" />
          </linearGradient>
          <linearGradient id={`${uid}-hill-mid`} x1="0.2" y1="0" x2="0.8" y2="1">
            <stop offset="0%" stopColor="#2f4a3c" />
            <stop offset="100%" stopColor="#1e3027" />
          </linearGradient>
          <linearGradient id={`${uid}-hill-front`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3a5a48" />
            <stop offset="100%" stopColor="#24382f" />
          </linearGradient>
        </defs>

        <rect y={viewMinY} width={VBW} height={viewHeight} fill={`url(#${uid}-sky)`} />

        <ellipse cx={95} cy={38} rx={42} ry={14} fill="#1c2a23" opacity={0.55} />
        <ellipse cx={268} cy={48} rx={56} ry={16} fill="#1a2620" opacity={0.45} />

        <path
          d="M-30 262 C 40 120, 120 145, 200 115 S 320 85, 440 105 L 440 262 Z"
          fill={`url(#${uid}-hill-back)`}
          opacity={0.55}
        />
        <path
          d="M-20 262 C 30 150, 110 130, 175 155 C 230 125, 290 135, 348 95 L 388 88 L 388 262 Z"
          fill={`url(#${uid}-hill-mid)`}
          opacity={0.75}
        />
        <path
          d="M0 262 C 55 185, 115 205, 165 165 C 215 125, 265 95, 300 72 C 328 52, 350 48, 382 44 L 400 42 L 400 262 Z"
          fill={`url(#${uid}-hill-front)`}
        />

        {[
          [72, 238],
          [98, 242],
          [128, 234],
          [288, 228],
        ].map(([x, y], i) => (
          <path key={i} d={`M${x} ${y} l6 -14 l6 14 z`} fill="#162019" opacity={0.85} />
        ))}

        <path
          d={trailD}
          fill="none"
          stroke="rgba(120, 145, 125, 0.45)"
          strokeWidth={9}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="7 11"
        />

        <path
          d={trailD}
          fill="none"
          stroke={NEON}
          strokeWidth={9}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={100}
          strokeDasharray={100}
          strokeDashoffset={100 - progress}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />

        {WEIGHT_JOURNEY_MILESTONES.map((pct) => {
          if (progress < pct + 3) return null;
          const [x, y] = pointOnWeightJourneyTrail(pct);
          return (
            <circle
              key={pct}
              cx={x}
              cy={y}
              r={4.5}
              fill={NEON}
              stroke="#0d1411"
              strokeWidth={1.5}
            />
          );
        })}

        <circle cx={base.x} cy={base.y} r={5.5} fill={NEON} stroke="#0d1411" strokeWidth={1.5} />
        <text
          x={base.x}
          y={base.y + 20}
          textAnchor="middle"
          fill="rgba(232,237,233,0.92)"
          fontSize={9}
          fontWeight={600}
          letterSpacing="0.14em"
        >
          START
        </text>
        {startLabel ? (
          <text
            x={base.x}
            y={base.y + 32}
            textAnchor="middle"
            fill="rgba(180,194,185,0.88)"
            fontSize={8}
            fontWeight={500}
            className="font-mono"
          >
            {startLabel}
          </text>
        ) : null}

        <g
          style={{ transition: "transform 0.6s ease" }}
          transform={`translate(${markerX}, ${markerY})`}
        >
          <circle r={13} fill={NEON} opacity={0.14} />
          <circle r={8.5} fill={NEON} stroke="#0d1411" strokeWidth={2.5} />
          <circle r={2.8} fill="#0d1411" />
        </g>

        <g transform={`translate(${summit.x}, ${summit.y})`}>
          <line x1={0} y1={0} x2={0} y2={-14} stroke="#c8d4cd" strokeWidth={1.2} />
          <path d="M0 -14 L11 -11 L0 -7.5 Z" fill={NEON} />
          <text
            x={-10}
            y={-11}
            textAnchor="end"
            fill="rgba(232,237,233,0.92)"
            fontSize={9}
            fontWeight={600}
            letterSpacing="0.1em"
          >
            SUMMIT
          </text>
          {targetLabel ? (
            <text
              x={-10}
              y={1}
              textAnchor="end"
              fill={NEON}
              fontSize={11}
              fontWeight={700}
              className="font-mono"
            >
              {targetLabel}
            </text>
          ) : null}
        </g>
      </svg>
    </div>
  );
}
