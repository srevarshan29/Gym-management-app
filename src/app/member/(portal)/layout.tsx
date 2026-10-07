import { unstable_cache } from "next/cache";

import { getRepositories, platformContext } from "@/lib/firestore";
import { requireMember } from "@/lib/member-session";
import { MemberPortalShell } from "@/components/member-portal/member-portal-shell";

function getMemberPortalGymName(gymId: string) {
  return unstable_cache(
    async () => {
      const { gyms } = getRepositories();
      const gym = await gyms.getById(platformContext, gymId);
      return gym?.name ?? "Your gym";
    },
    ["member-portal-gym-name", gymId],
    { revalidate: 300 },
  )();
}

export default async function MemberPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireMember();
  const gymName = await getMemberPortalGymName(session.gymId);

  return (
    <MemberPortalShell
      gymName={gymName}
      memberNumber={session.memberNumber}
      memberName={session.name}
    >
      {children}
    </MemberPortalShell>
  );
}
