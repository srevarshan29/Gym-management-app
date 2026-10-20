"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function hrefRouteKey(href: string): string {
  const [path, query] = href.split("?");
  return query ? `${path}?${query}` : path;
}

/** Full client route key (pathname + query), used to detect navigation completion. */
export function buildRouteKey(
  pathname: string,
  searchParams: { toString(): string },
): string {
  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function resolveLinkHref(
  href: string | { pathname?: string | null; query?: string | Record<string, string> | null },
): string {
  if (typeof href === "string") return href;
  const path = href.pathname ?? "";
  const query = href.query;
  if (!query) return path;
  if (typeof query === "string") return `${path}?${query}`;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value != null) params.set(key, String(value));
  }
  const q = params.toString();
  return q ? `${path}?${q}` : path;
}

export type NavigationLockOptions = {
  replace?: boolean;
  refresh?: boolean;
};

const NAVIGATION_LOCK_TIMEOUT_MS = 10_000;

/** Programmatic router navigation (and global lock). Native Link clicks opt out. */
export function shouldUseProgrammaticNavigation(
  hasClickEvent: boolean,
  hasBeforeNavigateHandler: boolean,
  options?: NavigationLockOptions,
): boolean {
  return (
    hasBeforeNavigateHandler ||
    !hasClickEvent ||
    options?.replace === true ||
    options?.refresh === true
  );
}

export async function runBeforeNavigateIfRegistered(
  beforeNavigate: (() => Promise<boolean>) | null,
): Promise<boolean> {
  if (!beforeNavigate) return true;
  return beforeNavigate();
}

export function useNavigationLock() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [, startTransition] = React.useTransition();
  const [pendingHref, setPendingHref] = React.useState<string | null>(null);
  const lockRef = React.useRef(false);
  const pendingHrefRef = React.useRef<string | null>(null);
  const beforeNavigateRef = React.useRef<(() => Promise<boolean>) | null>(null);

  const routeKey = React.useMemo(
    () => buildRouteKey(pathname, searchParams),
    [pathname, searchParams],
  );

  const isLocked = pendingHref !== null;

  const releaseLock = React.useCallback(() => {
    lockRef.current = false;
    pendingHrefRef.current = null;
    setPendingHref(null);
  }, []);

  React.useEffect(() => {
    releaseLock();
  }, [routeKey, releaseLock]);

  React.useEffect(() => {
    if (!pendingHref) return;
    const timeoutId = window.setTimeout(() => {
      releaseLock();
    }, NAVIGATION_LOCK_TIMEOUT_MS);
    return () => clearTimeout(timeoutId);
  }, [pendingHref, releaseLock]);

  const registerBeforeNavigate = React.useCallback(
    (handler: (() => Promise<boolean>) | null) => {
      beforeNavigateRef.current = handler;
    },
    [],
  );

  const runRegisteredBeforeLeave = React.useCallback(async () => {
    return runBeforeNavigateIfRegistered(beforeNavigateRef.current);
  }, []);

  const navigate = React.useCallback(
    async (
      href: string,
      e?: Pick<React.MouseEvent, "preventDefault">,
      options?: NavigationLockOptions,
    ): Promise<boolean> => {
      const target = hrefRouteKey(href);
      if (target === routeKey) {
        e?.preventDefault();
        return false;
      }

      if (lockRef.current && pendingHrefRef.current === target) {
        e?.preventDefault();
        return false;
      }

      const useProgrammaticNavigation = shouldUseProgrammaticNavigation(
        e != null,
        beforeNavigateRef.current != null,
        options,
      );
      if (!useProgrammaticNavigation) {
        return true;
      }

      e?.preventDefault();

      lockRef.current = true;
      pendingHrefRef.current = target;
      setPendingHref(target);

      const allowed = await runBeforeNavigateIfRegistered(
        beforeNavigateRef.current,
      );
      if (!allowed) {
        releaseLock();
        return false;
      }

      startTransition(() => {
        if (options?.replace) {
          router.replace(href);
        } else {
          router.push(href);
        }
        if (options?.refresh) {
          router.refresh();
        }
      });
      return false;
    },
    [routeKey, router, releaseLock],
  );

  return {
    navigate,
    registerBeforeNavigate,
    runRegisteredBeforeLeave,
    pendingHref,
    isLocked,
    currentRoute: routeKey,
    pathname,
  };
}

export type NavigationLock = ReturnType<typeof useNavigationLock>;
