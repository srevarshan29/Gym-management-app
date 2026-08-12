"use client";

import * as React from "react";

/**
 * Wraps a useFormState server action so a second submit is ignored while
 * the first request is still in flight.
 */
export function useGuardedFormAction<TState>(
  action: (
    prev: TState | undefined,
    formData: FormData,
  ) => Promise<TState | undefined> | TState | undefined,
) {
  const lockRef = React.useRef(false);

  return React.useCallback(
    async (
      prev: TState | undefined,
      formData: FormData,
    ): Promise<TState | undefined> => {
      if (lockRef.current) return prev;
      lockRef.current = true;
      try {
        return await action(prev, formData);
      } finally {
        lockRef.current = false;
      }
    },
    [action],
  );
}

/** Guards a plain server action (e.g. form action without useFormState). */
export function useGuardedServerAction<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
) {
  const lockRef = React.useRef(false);

  return React.useMemo(
    () =>
      async (...args: TArgs): Promise<TResult | undefined> => {
        if (lockRef.current) return undefined;
        lockRef.current = true;
        try {
          return await action(...args);
        } finally {
          lockRef.current = false;
        }
      },
    [action],
  );
}
