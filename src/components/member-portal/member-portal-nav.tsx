"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calculator, Dumbbell, Home, User } from "lucide-react";

import { isMemberPortalTabActive } from "@/lib/member-portal/member-portal-tab-match";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/member", label: "Overview", icon: Home, match: "overview" as const },
  { href: "/member/workout", label: "Workout", icon: Dumbbell, match: "workout" as const },
  { href: "/member/tools", label: "Tools", icon: Calculator, match: "tools" as const },
  { href: "/member/profile", label: "Profile", icon: User, match: "profile" as const },
] as const;

export function MemberPortalNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <div className="mx-auto grid max-w-2xl grid-cols-4">
        {TABS.map((tab) => {
          const active = isMemberPortalTabActive(pathname, tab.match);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              prefetch={true}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-1 px-2 py-2.5 text-xs font-medium transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
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
