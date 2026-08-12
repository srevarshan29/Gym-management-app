"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

function routeKey(pathname: string, search: string): string {
  return search ? `${pathname}?${search}` : pathname;
}

export function hrefRouteKey(href: string): string {
  const [path, query] = href.split("?");
  return query ? `${path}?${query}` : path;
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

export function useNavigationLock() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [, startTransition] = React.useTransition();
  const [pendingHref, setPendingHref] = React.useState<string | null>(null);
  const lockRef = React.useRef(false);

  const currentRoute = routeKey(pathname, searchParams.toString());
  const isLocked = pendingHref !== null;

  React.useEffect(() => {
    lockRef.current = false;
    setPendingHref(null);
  }, [currentRoute]);

  const navigate = React.useCallback(
    (
      href: string,
      e?: Pick<React.MouseEvent, "preventDefault">,
      options?: NavigationLockOptions,
    ): boolean => {
      const target = hrefRouteKey(href);
      if (target === currentRoute) return false;
      e?.preventDefault();
      if (lockRef.current) return false;

      lockRef.current = true;
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
    [currentRoute, router],
  );

  return {
    navigate,
    pendingHref,
    isLocked,
    currentRoute,
    pathname,
  };
}

export type NavigationLock = ReturnType<typeof useNavigationLock>;
