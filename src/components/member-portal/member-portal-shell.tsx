"use client";

import { Dumbbell } from "lucide-react";

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
      <div className="flex min-h-screen flex-col bg-background">
        <header className="border-b bg-card/80 px-3 py-3 backdrop-blur sm:px-4 sm:py-4">
          <div className="mx-auto flex max-w-2xl min-w-0 items-center justify-between gap-2 sm:gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Dumbbell className="h-5 w-5" />
              </div>
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
        <main className="mx-auto w-full min-w-0 max-w-2xl flex-1 p-3 sm:p-4">
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
