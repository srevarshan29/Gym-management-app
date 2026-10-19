"use client";

import * as React from "react";

import { usePrefersReducedMotion } from "@/components/member-portal/dashboard/use-prefers-reduced-motion";

export function useAnimatedNumber(
  target: number,
  durationMs = 420,
): number {
  const reducedMotion = usePrefersReducedMotion();
  const [display, setDisplay] = React.useState(target);
  const displayRef = React.useRef(target);

  React.useEffect(() => {
    displayRef.current = display;
  }, [display]);

  React.useEffect(() => {
    if (reducedMotion) {
      setDisplay(target);
      displayRef.current = target;
      return;
    }
    const start = displayRef.current;
    if (start === target) return;

    const startTime = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(start + (target - start) * eased);
      setDisplay(next);
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        displayRef.current = target;
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs, reducedMotion]);

  return display;
}
