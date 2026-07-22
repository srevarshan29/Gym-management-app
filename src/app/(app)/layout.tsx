import { requireGym } from "@/lib/session";
import { canLogPayments } from "@/lib/permissions";
import { Sidebar } from "@/components/sidebar";
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

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Gates the entire (app) shell to gym-scoped accounts — SUPER_ADMIN (no
  // gym) is redirected to /admin before any child page can run.
  const user = await requireGym();
  const isOwner = user.role === "OWNER";

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        isOwner={isOwner}
        canLogPayments={canLogPayments(user.role)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b bg-card px-6">
          <div className="md:hidden font-display text-lg font-bold">GymDesk</div>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-medium leading-tight">
                {user.name ?? user.email}
              </div>
              <div className="text-xs text-muted-foreground">
                {user.email}
              </div>
            </div>
            <Avatar>
              <AvatarFallback>{initials(user.name ?? "?")}</AvatarFallback>
            </Avatar>
            <Badge variant="secondary">{ROLE_LABEL[user.role] ?? user.role}</Badge>
            <ThemeToggle />
            <SignOutButton />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
