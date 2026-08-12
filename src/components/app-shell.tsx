"use client";

import { SidebarProvider } from "@/components/sidebar-provider";
import { Sidebar } from "@/components/sidebar";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { NavigationLockProvider } from "@/components/navigation/navigation-lock-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { initials } from "@/lib/utils";

const ROLE_LABEL: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  STAFF: "Staff",
};

export function AppShell({
  user,
  isOwner,
  isOwnerOrAdmin,
  canLogPayments,
  children,
}: {
  user: {
    name: string | null;
    email: string;
    role: string;
  };
  isOwner: boolean;
  isOwnerOrAdmin: boolean;
  canLogPayments: boolean;
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <NavigationLockProvider>
        <div className="flex min-h-screen bg-background">
        <Sidebar
          isOwner={isOwner}
          isOwnerOrAdmin={isOwnerOrAdmin}
          canLogPayments={canLogPayments}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-card px-4 sm:h-16 sm:gap-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <SidebarToggle />
              <div className="truncate font-display text-lg font-bold md:hidden">
                GymDesk
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
              <div className="hidden text-right lg:block">
                <div className="text-sm font-medium leading-tight">
                  {user.name ?? user.email}
                </div>
                <div className="text-xs text-muted-foreground">{user.email}</div>
              </div>
              <Avatar>
                <AvatarFallback>{initials(user.name ?? "?")}</AvatarFallback>
              </Avatar>
              <Badge variant="secondary">
                {ROLE_LABEL[user.role] ?? user.role}
              </Badge>
              <ThemeToggle />
              <SignOutButton />
            </div>
          </header>

          <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6">
            {children}
          </main>
        </div>
        </div>
      </NavigationLockProvider>
    </SidebarProvider>
  );
}
