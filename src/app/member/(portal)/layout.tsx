import { getRepositories, platformContext } from "@/lib/firestore";
import { requireMember } from "@/lib/member-session";
import { MemberPortalShell } from "@/components/member-portal/member-portal-shell";

export default async function MemberPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireMember();
  const { gyms } = getRepositories();
  const gym = await gyms.getById(platformContext, session.gymId);

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
