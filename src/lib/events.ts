import { getRepositories, platformContext } from "@/lib/firestore";
import { EVENTS_PORTAL_LIMIT } from "@/lib/firestore/repositories/events";

export type GymEventListItem = {
  id: string;
  title: string;
  eventDate: Date;
  location: string;
  description: string | null;
};

function toListItem(doc: {
  id: string;
  title: string;
  eventDate: { toDate(): Date };
  location: string;
  description: string | null;
}): GymEventListItem {
  return {
    id: doc.id,
    title: doc.title,
    eventDate: doc.eventDate.toDate(),
    location: doc.location,
    description: doc.description,
  };
}

/** Staff events page — upcoming first, then past (max 50 rows). */
export async function getEvents(tenantGymId: string): Promise<GymEventListItem[]> {
  const { events } = getRepositories();
  const rows = await events.listForPortal(
    platformContext,
    tenantGymId,
    EVENTS_PORTAL_LIMIT,
  );
  return rows.map(toListItem);
}

/** Full list for CSV export (cursor-paged, capped at 1000 rows). */
export async function getAllEventsForExport(
  tenantGymId: string,
): Promise<GymEventListItem[]> {
  const { events } = getRepositories();
  const rows = await events.listAllForExport(platformContext, tenantGymId);
  return rows.map(toListItem);
}
