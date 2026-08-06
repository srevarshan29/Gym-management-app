import { ShieldCheck } from "lucide-react";

import { requireSuperAdmin } from "@/lib/session";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSuperAdmin();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-16 items-center justify-between border-b bg-card px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">
            GymDesk <span className="text-muted-foreground">Platform Admin</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <div className="text-sm font-medium leading-tight">
              {user.name ?? user.email}
            </div>
            <div className="text-xs text-muted-foreground">{user.email}</div>
          </div>
          <ThemeToggle />
          <SignOutButton />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
