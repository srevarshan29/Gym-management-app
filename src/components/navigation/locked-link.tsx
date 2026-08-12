"use client";

import * as React from "react";
import Link from "next/link";

import { useSharedNavigationLock } from "@/components/navigation/navigation-lock-provider";
import type { NavigationLockOptions } from "@/hooks/use-navigation-lock";
import { hrefRouteKey, resolveLinkHref } from "@/hooks/use-navigation-lock";
import { cn } from "@/lib/utils";

type LockedLinkProps = Omit<
  React.ComponentProps<typeof Link>,
  "onClick"
> & {
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  navigationOptions?: NavigationLockOptions;
};

export function LockedLink({
  href,
  className,
  children,
  onClick,
  navigationOptions,
  ...props
}: LockedLinkProps) {
  const { navigate, isLocked, pendingHref } = useSharedNavigationLock();
  const hrefString =
    typeof href === "string" ? href : resolveLinkHref(href as Parameters<typeof resolveLinkHref>[0]);
  const targetKey = hrefRouteKey(hrefString);
  const isNavigating = pendingHref === targetKey;

  return (
    <Link
      href={href}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) {
          navigate(hrefString, e, navigationOptions);
        }
      }}
      aria-busy={isNavigating}
      aria-disabled={isLocked}
      tabIndex={isLocked && !isNavigating ? -1 : props.tabIndex}
      className={cn(className, isNavigating && "opacity-80")}
      {...props}
    >
      {children}
    </Link>
  );
}
