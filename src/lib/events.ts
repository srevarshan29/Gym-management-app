import { withTenant } from "@/lib/db-context";

export type GymEventListItem = {
  id: string;
  title: string;
  eventDate: Date;
  location: string;
  description: string | null;
};

function startOfTodayLocal(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function sortEventsUpcomingThenPast(
  rows: GymEventListItem[],
): GymEventListItem[] {
  const today = startOfTodayLocal();
  const upcoming: GymEventListItem[] = [];
  const past: GymEventListItem[] = [];

  for (const row of rows) {
    const d = new Date(row.eventDate);
    if (d >= today) {
      upcoming.push(row);
    } else {
      past.push(row);
    }
  }

  upcoming.sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());
  past.sort((a, b) => b.eventDate.getTime() - a.eventDate.getTime());

  return [...upcoming, ...past];
}

export async function getEvents(gymId: string): Promise<GymEventListItem[]> {
  const rows = await withTenant(gymId, (tx) =>
    tx.gymEvent.findMany({
      where: { gymId },
      select: {
        id: true,
        title: true,
        eventDate: true,
        location: true,
        description: true,
      },
    }),
  );

  return sortEventsUpcomingThenPast(rows);
}
