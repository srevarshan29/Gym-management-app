"use client";

import * as React from "react";

import {
  useNavigationLock,
  usePathnameNavigationLock,
  type NavigationLock,
} from "@/hooks/use-navigation-lock";

const NavigationLockContext = React.createContext<NavigationLock | null>(null);

function NavigationLockContextProvider({
  lock,
  children,
}: {
  lock: NavigationLock;
  children: React.ReactNode;
}) {
  return (
    <NavigationLockContext.Provider value={lock}>
      {children}
    </NavigationLockContext.Provider>
  );
}

/** Staff / query-aware shells (uses `useSearchParams`). */
export function NavigationLockProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const lock = useNavigationLock();
  return (
    <NavigationLockContextProvider lock={lock}>
      {children}
    </NavigationLockContextProvider>
  );
}

/**
 * Member portal shell — pathname-only route key (no `useSearchParams`), so bottom
 * nav stays interactive on first paint without search-param CSR bailout.
 */
export function PathnameNavigationLockProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const lock = usePathnameNavigationLock();
  return (
    <NavigationLockContextProvider lock={lock}>
      {children}
    </NavigationLockContextProvider>
  );
}

/** Shared navigation lock for the current app shell (staff or member portal). */
export function useSharedNavigationLock(): NavigationLock {
  const context = React.useContext(NavigationLockContext);
  if (!context) {
    throw new Error(
      "useSharedNavigationLock must be used within NavigationLockProvider or PathnameNavigationLockProvider",
    );
  }
  return context;
}

/** Runs before shell `navigate` / `LockedLink` when registered (e.g. personal workout editor). */
export function useRegisterBeforeNavigate(
  handler: (() => Promise<boolean>) | null,
) {
  const { registerBeforeNavigate } = useSharedNavigationLock();
  React.useEffect(() => {
    registerBeforeNavigate(handler);
    return () => registerBeforeNavigate(null);
  }, [handler, registerBeforeNavigate]);
}
