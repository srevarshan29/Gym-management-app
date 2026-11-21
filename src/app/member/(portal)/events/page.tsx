import { EventBanner } from "@/components/events/event-banner";
import { requireMember } from "@/lib/member-session";
import { getMemberPortalEvents } from "@/lib/member-portal/queries";
import { isEventPast } from "@/lib/events/event-scheduling";
import { formatDate } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default async function MemberEventsPage() {
  const session = await requireMember();
  const events = await getMemberPortalEvents(session.gymId);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-bold">Gym events</h1>
      {events.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No events scheduled yet.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-4">
          {events.map((event) => {
            const isPast = isEventPast(event.eventDate);
            return (
              <li key={event.id}>
                <Card
                  className={cn(
                    "overflow-hidden",
                    isPast && "opacity-75",
                  )}
                >
                  <EventBanner
                    title={event.title}
                    eventDate={event.eventDate}
                    location={event.location}
                    description={event.description}
                    bannerImageUrl={event.bannerImageUrl}
                    className="rounded-none rounded-t-lg"
                  />
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{event.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(event.eventDate)} · {event.location}
                      {isPast ? " · Past" : ""}
                    </p>
                  </CardHeader>
                  {event.description ? (
                    <CardContent className="pt-0 text-sm text-muted-foreground">
                      {event.description}
                    </CardContent>
                  ) : null}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
