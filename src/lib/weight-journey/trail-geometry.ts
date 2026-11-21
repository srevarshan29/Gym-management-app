/**
 * Stylized climb path — smooth S-curve inset inside padded viewBox (400 × 260).
 */
export type Point = { x: number; y: number };

type CubicSegment = {
  p0: Point;
  p1: Point;
  p2: Point;
  p3: Point;
};

/** Two cubics with C¹ continuity at the bend (no kinks). */
const TRAIL_SEGMENTS: CubicSegment[] = [
  {
    p0: { x: 72, y: 196 },
    p1: { x: 118, y: 192 },
    p2: { x: 148, y: 148 },
    p3: { x: 192, y: 118 },
  },
  {
    p0: { x: 192, y: 118 },
    p1: { x: 236, y: 88 },
    p2: { x: 278, y: 58 },
    p3: { x: 312, y: 48 },
  },
];

function cubicPoint(seg: CubicSegment, t: number): Point {
  const u = 1 - t;
  const x =
    u * u * u * seg.p0.x +
    3 * u * u * t * seg.p1.x +
    3 * u * t * t * seg.p2.x +
    t * t * t * seg.p3.x;
  const y =
    u * u * u * seg.p0.y +
    3 * u * u * t * seg.p1.y +
    3 * u * t * t * seg.p2.y +
    t * t * t * seg.p3.y;
  return { x, y };
}

export function weightJourneyTrailPathD(): string {
  const [first] = TRAIL_SEGMENTS;
  let d = `M ${first!.p0.x} ${first!.p0.y}`;
  for (const seg of TRAIL_SEGMENTS) {
    d += ` C ${seg.p1.x} ${seg.p1.y}, ${seg.p2.x} ${seg.p2.y}, ${seg.p3.x} ${seg.p3.y}`;
  }
  return d;
}

export function pointOnWeightJourneyTrail(progressPercent: number): [number, number] {
  const clamped = Math.min(100, Math.max(0, progressPercent)) / 100;
  const segmentCount = TRAIL_SEGMENTS.length;
  const scaled = clamped * segmentCount;
  const index = Math.min(segmentCount - 1, Math.floor(scaled));
  const localT = scaled - index;
  const seg = TRAIL_SEGMENTS[index]!;
  const p = cubicPoint(seg, localT);
  return [p.x, p.y];
}

/** Milestone dots along the completed portion (reference-style waypoints). */
export const WEIGHT_JOURNEY_MILESTONES = [22, 44, 66] as const;

/** Extra inset so START / SUMMIT labels are not clipped. */
export const WEIGHT_JOURNEY_VIEWBOX = { w: 400, h: 260, padTop: 18, padBottom: 8 } as const;

export const WEIGHT_JOURNEY_SUMMIT: Point = TRAIL_SEGMENTS[TRAIL_SEGMENTS.length - 1]!.p3;

export const WEIGHT_JOURNEY_TRAIL_START: Point = TRAIL_SEGMENTS[0]!.p0;
