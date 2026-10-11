"use client";

import * as React from "react";

import {
  useNavigationLock,
  type NavigationLock,
} from "@/hooks/use-navigation-lock";

const NavigationLockContext = React.createContext<NavigationLock | null>(null);

export function NavigationLockProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const lock = useNavigationLock();
  return (
    <NavigationLockContext.Provider value={lock}>
      {children}
    </NavigationLockContext.Provider>
  );
}

/** Shared navigation lock for the current app shell (staff or member portal). */
export function useSharedNavigationLock(): NavigationLock {
  const context = React.useContext(NavigationLockContext);
  if (!context) {
    throw new Error(
      "useSharedNavigationLock must be used within NavigationLockProvider",
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
