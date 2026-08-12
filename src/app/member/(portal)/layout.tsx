import { prisma } from "@/lib/prisma";import { requireMember } from "@/lib/member-session";
import { MemberPortalShell } from "@/components/member-portal/member-portal-shell";

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
    <MemberPortalShell
      gymName={gym?.name ?? "Your gym"}
      memberNumber={session.memberNumber}
      memberName={session.name}
    >
      {children}
    </MemberPortalShell>
  );
}
