import { unstable_cache } from "next/cache";

import { MemberEventAnnouncements } from "@/components/member-portal/member-event-announcements";
import { MemberPortalShell } from "@/components/member-portal/member-portal-shell";
import { filterAnnounceableEvents } from "@/lib/events/event-scheduling";
import { getRepositories, platformContext } from "@/lib/firestore";
import { getMemberPortalEvents } from "@/lib/member-portal/queries";
import { requireMember } from "@/lib/member-session";

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
  const [gymName, portalEvents] = await Promise.all([
    getMemberPortalGymName(session.gymId),
    getMemberPortalEvents(session.gymId),
  ]);
  const announcementEvents = filterAnnounceableEvents(portalEvents);

  return (
    <MemberPortalShell
      gymName={gymName}
      memberNumber={session.memberNumber}
      memberName={session.name}
    >
      <MemberEventAnnouncements events={announcementEvents} />
      {children}
    </MemberPortalShell>
  );
}
