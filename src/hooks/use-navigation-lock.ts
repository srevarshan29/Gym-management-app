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

export function useNavigationLock() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [, startTransition] = React.useTransition();
  const [pendingHref, setPendingHref] = React.useState<string | null>(null);
  const lockRef = React.useRef(false);
  const pendingHrefRef = React.useRef<string | null>(null);

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

  const navigate = React.useCallback(
    (
      href: string,
      e?: Pick<React.MouseEvent, "preventDefault">,
      options?: NavigationLockOptions,
    ): boolean => {
      const target = hrefRouteKey(href);
      const targetPath = target.split("?")[0] ?? target;
      if (target === routeKey) return false;
      if (!target.includes("?") && targetPath === pathname) return false;
      e?.preventDefault();

      if (lockRef.current && pendingHrefRef.current === target) {
        return false;
      }

      lockRef.current = true;
      pendingHrefRef.current = target;
      setPendingHref(target);
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
      return true;
    },
    [pathname, routeKey, router],
  );

  return {
    navigate,
    pendingHref,
    isLocked,
    currentRoute: routeKey,
    pathname,
  };
}

export type NavigationLock = ReturnType<typeof useNavigationLock>;
