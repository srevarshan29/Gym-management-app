"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calculator, Dumbbell, Home, Loader2, User } from "lucide-react";

import { useSharedNavigationLock } from "@/components/navigation/navigation-lock-provider";
import { hrefRouteKey } from "@/hooks/use-navigation-lock";
import {
  isMemberPortalTabActive,
  memberPortalTabPendingShouldClear,
  type MemberPortalTabMatch,
} from "@/lib/member-portal/member-portal-tab-match";
import { cn } from "@/lib/utils";

export const MEMBER_PORTAL_NAV_PENDING_TIMEOUT_MS = 10_000;

const TABS = [
  { href: "/member", label: "Overview", icon: Home, match: "overview" as const },
  { href: "/member/workout", label: "Workout", icon: Dumbbell, match: "workout" as const },
  { href: "/member/tools", label: "Tools", icon: Calculator, match: "tools" as const },
  { href: "/member/profile", label: "Profile", icon: User, match: "profile" as const },
] as const;

export function MemberPortalNav() {
  const pathname = usePathname();
  const { navigate, pendingHref } = useSharedNavigationLock();
  const [pendingTabMatch, setPendingTabMatch] =
    React.useState<MemberPortalTabMatch | null>(null);

  React.useEffect(() => {
    if (memberPortalTabPendingShouldClear(pathname, pendingTabMatch)) {
      setPendingTabMatch(null);
    }
  }, [pathname, pendingTabMatch]);

  React.useEffect(() => {
    if (!pendingTabMatch) return;
    const timeoutId = window.setTimeout(() => {
      setPendingTabMatch(null);
    }, MEMBER_PORTAL_NAV_PENDING_TIMEOUT_MS);
    return () => window.clearTimeout(timeoutId);
  }, [pendingTabMatch]);

  const navBusy = pendingHref !== null || pendingTabMatch !== null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      aria-busy={navBusy}
    >
      <div className="mx-auto grid max-w-2xl grid-cols-4">
        {TABS.map((tab) => {
          const active = isMemberPortalTabActive(pathname, tab.match);
          const targetKey = hrefRouteKey(tab.href);
          const lockNavigating = pendingHref === targetKey;
          const tabPending = pendingTabMatch === tab.match;
          const isNavigating = lockNavigating || tabPending;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              prefetch={true}
              data-nav-pending={tabPending ? "true" : undefined}
              onClick={(e) => {
                if (!active) {
                  setPendingTabMatch(tab.match);
                }
                void navigate(tab.href, e);
              }}
              aria-busy={isNavigating}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-1 px-2 py-2.5 text-xs font-medium transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
                isNavigating && "opacity-70",
              )}
            >
              {tabPending ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              ) : (
                <Icon className="h-5 w-5" />
              )}
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
