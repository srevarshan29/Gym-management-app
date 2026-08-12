"use client";

import * as React from "react";

/**
 * Prevents duplicate concurrent invocations of the same async handler
 * (e.g. double-clicks on delete buttons or server actions).
 */
export function useActionLock() {
  const lockRef = React.useRef(false);
  const [isPending, setIsPending] = React.useState(false);

  const run = React.useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
      if (lockRef.current) return undefined;
      lockRef.current = true;
      setIsPending(true);
      try {
        return await fn();
      } finally {
        lockRef.current = false;
        setIsPending(false);
      }
    },
    [],
  );

  return { run, isPending, isLocked: isPending };
}
