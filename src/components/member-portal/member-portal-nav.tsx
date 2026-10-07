"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calculator, Dumbbell, Home, User } from "lucide-react";

import { useSharedNavigationLock } from "@/components/navigation/navigation-lock-provider";
import { hrefRouteKey } from "@/hooks/use-navigation-lock";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/member", label: "Overview", icon: Home, match: "overview" },
  { href: "/member/workout", label: "Workout", icon: Dumbbell, match: "workout" },
  { href: "/member/tools", label: "Tools", icon: Calculator, match: "tools" },
  { href: "/member/profile", label: "Profile", icon: User, match: "profile" },
] as const;

function isTabActive(pathname: string, match: (typeof TABS)[number]["match"]) {
  switch (match) {
    case "overview":
      return pathname === "/member";
    case "workout":
      return (
        pathname === "/member/workout" ||
        pathname.startsWith("/member/workout/")
      );
    case "profile":
      return (
        pathname === "/member/profile" ||
        pathname.startsWith("/member/profile/")
      );
    case "tools":
      return (
        pathname === "/member/tools" ||
        pathname.startsWith("/member/tools/") ||
        pathname === "/member/payments" ||
        pathname.startsWith("/member/payments/") ||
        pathname === "/member/diet" ||
        pathname.startsWith("/member/diet/") ||
        pathname === "/member/events" ||
        pathname.startsWith("/member/events/") ||
        pathname === "/member/nutrition" ||
        pathname.startsWith("/member/nutrition/")
      );
    default:
      return false;
  }
}

export function MemberPortalNav() {
  const pathname = usePathname();
  const { navigate, pendingHref } = useSharedNavigationLock();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      aria-busy={pendingHref !== null}
    >
      <div className="mx-auto grid max-w-2xl grid-cols-4">
        {TABS.map((tab) => {
          const active = isTabActive(pathname, tab.match);
          const targetKey = hrefRouteKey(tab.href);
          const isNavigating = pendingHref === targetKey;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              prefetch={true}
              onClick={(e) => navigate(tab.href, e)}
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
              <Icon className="h-5 w-5" />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
