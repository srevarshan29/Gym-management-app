import { requireGym } from "@/lib/session";
import { canLogPayments, canManageEmployees } from "@/lib/permissions";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireGym();
  const isOwner = user.role === "OWNER";

  return (
    <AppShell
      user={{
        name: user.name ?? null,
        email: user.email ?? "",
        role: user.role,
      }}
      isOwner={isOwner}
      isOwnerOrAdmin={canManageEmployees(user.role)}
      canLogPayments={canLogPayments(user.role)}
    >
      {children}
    </AppShell>
  );
}
