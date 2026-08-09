"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Dumbbell, X } from "lucide-react";

import { useSidebar } from "@/components/sidebar-provider";
import {
  SIDEBAR_FOOTER_ITEM,
  SIDEBAR_SECTIONS,
  getActiveNavHref,
  isNavItemVisible,
  type SidebarNavItem,
} from "@/lib/sidebar-nav";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function NavLink({
  item,
  activeHref,
  pendingHref,
  isPending,
  onNavigate,
}: {
  item: SidebarNavItem;
  activeHref: string | null;
  pendingHref: string | null;
  isPending: boolean;
  onNavigate: (href: string, e: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  const active = pendingHref
    ? item.href === pendingHref
    : activeHref === item.href;
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={(e) => onNavigate(item.href, e)}
      aria-busy={pendingHref === item.href && isPending}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "hover-lift-glow bg-primary text-primary-foreground shadow-glow"
          : "hover-lift text-muted-foreground hover:bg-accent hover:text-foreground",
        pendingHref === item.href && isPending ? "opacity-80" : "",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {item.label}
    </Link>
  );
}

function SidebarNavContent({
  isOwner,
  isOwnerOrAdmin,
  canLogPayments,
  onClose,
  showCloseButton,
}: {
  isOwner: boolean;
  isOwnerOrAdmin: boolean;
  canLogPayments: boolean;
  onClose?: () => void;
  showCloseButton?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [pendingHref, setPendingHref] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isPending) setPendingHref(null);
  }, [isPending, pathname]);

  const prevPathname = React.useRef(pathname);
  React.useEffect(() => {
    if (prevPathname.current === pathname) return;
    prevPathname.current = pathname;
    onClose?.();
  }, [pathname, onClose]);

  function handleNavigate(
    href: string,
    e: React.MouseEvent<HTMLAnchorElement>,
  ) {
    if (href === pathname) return;
    e.preventDefault();
    setPendingHref(href);
    startTransition(() => {
      router.push(href);
    });
  }

  const showFooter = isNavItemVisible(
    SIDEBAR_FOOTER_ITEM,
    isOwner,
    canLogPayments,
    isOwnerOrAdmin,
  );

  const allNavItems = React.useMemo(() => {
    const items = SIDEBAR_SECTIONS.flatMap((section) =>
      section.items.filter((item) =>
        isNavItemVisible(item, isOwner, canLogPayments, isOwnerOrAdmin),
      ),
    );
    if (showFooter) items.push(SIDEBAR_FOOTER_ITEM);
    return items;
  }, [isOwner, isOwnerOrAdmin, canLogPayments, showFooter]);

  const activeHref = getActiveNavHref(pathname, allNavItems);

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-2 px-2">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Dumbbell className="h-5 w-5" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight whitespace-nowrap">
            GymDesk
          </span>
        </div>
        {showCloseButton ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={onClose}
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" />
          </Button>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <nav className="flex flex-col gap-1 overflow-y-auto">
          {SIDEBAR_SECTIONS.map((section, sectionIndex) => {
            const visibleItems = section.items.filter((item) =>
              isNavItemVisible(item, isOwner, canLogPayments, isOwnerOrAdmin),
            );

            return (
              <div key={section.id}>
                <p
                  className={cn(
                    "px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                    sectionIndex === 0 ? "pt-0" : "pt-4",
                  )}
                >
                  {section.label}
                </p>
                {visibleItems.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {visibleItems.map((item) => (
                      <NavLink
                        key={item.href}
                        item={item}
                        activeHref={activeHref}
                        pendingHref={pendingHref}
                        isPending={isPending}
                        onNavigate={handleNavigate}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>

        {showFooter ? (
          <div className="mt-auto border-t border-border/60 pt-4">
            <NavLink
              item={SIDEBAR_FOOTER_ITEM}
              activeHref={activeHref}
              pendingHref={pendingHref}
              isPending={isPending}
              onNavigate={handleNavigate}
            />
          </div>
        ) : null}
      </div>
    </>
  );
}

export function Sidebar({
  isOwner,
  isOwnerOrAdmin,
  canLogPayments,
}: {
  isOwner: boolean;
  isOwnerOrAdmin: boolean;
  canLogPayments: boolean;
}) {
  const { collapsed, mobileOpen, closeMobile } = useSidebar();

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          aria-label="Close navigation menu"
          onClick={closeMobile}
        />
      ) : null}

      <aside
        id="mobile-sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(18rem,88vw)] flex-col border-r bg-card px-4 py-6 shadow-lg transition-transform duration-200 ease-out md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full pointer-events-none",
        )}
        aria-hidden={!mobileOpen}
      >
        <SidebarNavContent
          isOwner={isOwner}
          isOwnerOrAdmin={isOwnerOrAdmin}
          canLogPayments={canLogPayments}
          onClose={closeMobile}
          showCloseButton
        />
      </aside>

      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r bg-card/70 backdrop-blur transition-all duration-200 md:flex",
          collapsed
            ? "w-0 overflow-hidden border-r-0 px-0 py-0 opacity-0 pointer-events-none"
            : "w-64 px-4 py-6 opacity-100",
        )}
      >
        <SidebarNavContent
          isOwner={isOwner}
          isOwnerOrAdmin={isOwnerOrAdmin}
          canLogPayments={canLogPayments}
        />
      </aside>
    </>
  );
}
