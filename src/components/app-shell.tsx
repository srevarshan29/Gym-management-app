"use client";

import { SidebarProvider } from "@/components/sidebar-provider";
import { Sidebar } from "@/components/sidebar";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
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
  canLogPayments,
  children,
}: {
  user: {
    name: string | null;
    email: string;
    role: string;
  };
  isOwner: boolean;
  canLogPayments: boolean;
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar isOwner={isOwner} canLogPayments={canLogPayments} />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 items-center justify-between gap-3 border-b bg-card px-6">
            <div className="flex min-w-0 items-center gap-3">
              <SidebarToggle />
              <div className="font-display text-lg font-bold md:hidden">
                GymDesk
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
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

          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
