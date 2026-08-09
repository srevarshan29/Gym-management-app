import { requireMember } from "@/lib/member-session";
import { getMemberPortalEvents } from "@/lib/member-portal/queries";
import { formatDate } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function MemberEventsPage() {
  const session = await requireMember();
  const events = await getMemberPortalEvents(session.gymId);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

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
        <ul className="space-y-3">
          {events.map((event) => {
            const isPast = new Date(event.eventDate) < today;
            return (
              <li key={event.id}>
                <Card className={isPast ? "opacity-75" : undefined}>
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
