"use client";

import { GymDeskLogo } from "@/components/gymdesk-logo";
import { MemberPortalNav } from "@/components/member-portal/member-portal-nav";
import { MemberSignOutButton } from "@/components/member-portal/member-sign-out-button";
import { LockedLink } from "@/components/navigation/locked-link";
import { NavigationLockProvider } from "@/components/navigation/navigation-lock-provider";

export function MemberPortalShell({
  gymName,
  memberNumber,
  memberName,
  children,
}: {
  gymName: string;
  memberNumber: number;
  memberName: string;
  children: React.ReactNode;
}) {
  return (
    <NavigationLockProvider>
      <div className="flex min-h-dvh min-w-0 flex-col bg-background">
        <header className="app-shell-header safe-area-top safe-area-x sticky top-0 z-30 border-b bg-card/80 backdrop-blur">
          <div className="mx-auto flex max-w-2xl min-w-0 items-center justify-between gap-2 py-3 sm:gap-3 sm:py-4">
            <div className="flex min-w-0 items-center gap-2">
              <GymDeskLogo variant="mark" />
              <div className="min-w-0">
                <p className="font-display text-sm font-bold leading-tight">
                  Member Portal
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {gymName} · #{String(memberNumber).padStart(4, "0")}
                </p>
              </div>
            </div>
            <MemberSignOutButton />
          </div>
        </header>
        <main className="safe-area-x mx-auto w-full min-w-0 max-w-2xl flex-1 py-4 pb-[max(6rem,env(safe-area-inset-bottom,0px))] sm:py-4">
          {children}
        </main>
        <footer className="border-t py-3 pb-24 text-center text-xs text-muted-foreground">
          <LockedLink href="/member/profile" className="hover:text-foreground">
            {memberName}
          </LockedLink>
        </footer>
        <MemberPortalNav />
      </div>
    </NavigationLockProvider>
  );
}
