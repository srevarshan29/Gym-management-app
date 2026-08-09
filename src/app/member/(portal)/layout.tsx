import Link from "next/link";
import { Dumbbell } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/member-session";
import { MemberPortalNav } from "@/components/member-portal/member-portal-nav";
import { MemberSignOutButton } from "@/components/member-portal/member-sign-out-button";

export default async function MemberPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireMember();
  const gym = await prisma.gym.findUnique({
    where: { id: session.gymId },
    select: { name: true },
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b bg-card/80 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Dumbbell className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-sm font-bold leading-tight">
                Member Portal
              </p>
              <p className="text-xs text-muted-foreground">
                {gym?.name ?? "Your gym"} · #{String(session.memberNumber).padStart(4, "0")}
              </p>
            </div>
          </div>
          <MemberSignOutButton />
        </div>
        <div className="mx-auto mt-4 max-w-2xl">
          <MemberPortalNav />
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 p-4">{children}</main>
      <footer className="border-t py-3 text-center text-xs text-muted-foreground">
        <Link href="/member/profile" className="hover:text-foreground">
          {session.name}
        </Link>
      </footer>
    </div>
  );
}
