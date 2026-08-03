import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

import { requireGym } from "@/lib/session";
import { canManageEvents } from "@/lib/permissions";
import { getEvents } from "@/lib/events";
import { PageHeader } from "@/components/page-header";
import { EventDialog } from "@/components/event-dialog";
import { EventsList } from "@/components/events-list";
import { ProgrammePlansPageSkeleton } from "@/components/page-loading-skeletons";
import { Button } from "@/components/ui/button";

export default async function EventsPage() {
  const user = await requireGym();
  if (!canManageEvents(user.role)) {
    redirect("/");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Events"
        description="Workshops, competitions, open houses, and other gym activities."
      >
        <EventDialog
          trigger={
            <Button className="gap-1">
              <Plus className="h-4 w-4" /> Add event
            </Button>
          }
        />
      </PageHeader>

      <Suspense fallback={<ProgrammePlansPageSkeleton />}>
        <EventsPageContent gymId={user.gymId} />
      </Suspense>
    </div>
  );
}

async function EventsPageContent({ gymId }: { gymId: string }) {
  const rows = await getEvents(gymId);

  const events = rows.map((row) => ({
    id: row.id,
    title: row.title,
    eventDate: row.eventDate.toISOString(),
    location: row.location,
    description: row.description,
  }));

  return <EventsList events={events} />;
}
