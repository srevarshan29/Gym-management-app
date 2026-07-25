"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Package,
  CreditCard,
  Settings,
  Dumbbell,
  CalendarClock,
  CalendarX2,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  ownerOnly?: boolean;
  requiresLogPayments?: boolean;
};

const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/members", label: "Members", icon: Users },
  { href: "/renewals", label: "Upcoming Renewals", icon: CalendarClock },
  { href: "/expired", label: "Expired Memberships", icon: CalendarX2 },
  { href: "/packages", label: "Packages", icon: Package },
  {
    href: "/payments",
    label: "Payments",
    icon: CreditCard,
    requiresLogPayments: true,
  },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({
  isOwner,
  canLogPayments,
}: {
  isOwner: boolean;
  canLogPayments: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  // Tracks which link was just clicked so it can look "active" instantly,
  // before the server component for the destination has actually resolved.
  const [pendingHref, setPendingHref] = React.useState<string | null>(null);

  const items = NAV.filter((item) => {
    if (item.ownerOnly && !isOwner) return false;
    if (item.requiresLogPayments && !canLogPayments) return false;
    return true;
  });

  React.useEffect(() => {
    // Once the real route catches up, drop the optimistic pending state.
    if (!isPending) setPendingHref(null);
  }, [isPending, pathname]);

  function handleNavigate(href: string, e: React.MouseEvent<HTMLAnchorElement>) {
    if (href === pathname) return;
    e.preventDefault();
    setPendingHref(href);
    startTransition(() => {
      router.push(href);
    });
  }

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r bg-card/70 px-4 py-6 backdrop-blur md:flex">
      <div className="mb-8 flex items-center gap-2 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Dumbbell className="h-5 w-5" />
        </div>
        <span className="font-display text-lg font-bold tracking-tight">GymDesk</span>
      </div>

      <nav className="flex flex-col gap-1">
        {items.map((item) => {
          const active = pendingHref
            ? item.href === pendingHref
            : item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={(e) => handleNavigate(item.href, e)}
              aria-busy={pendingHref === item.href && isPending}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                // Second (and last) glow element in the app, by design.
                active
                  ? "hover-lift-glow bg-primary text-primary-foreground shadow-glow"
                  : "hover-lift text-muted-foreground hover:bg-accent hover:text-foreground",
                pendingHref === item.href && isPending ? "opacity-80" : "",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
