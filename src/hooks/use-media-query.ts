"use client";

import * as React from "react";

/** Subscribes to a CSS media query. `defaultValue` is the SSR / first-hydration snapshot. */
export function useMediaQuery(query: string, defaultValue = false): boolean {
  return React.useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => defaultValue,
  );
}
