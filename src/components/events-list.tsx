"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteEvent } from "@/app/actions/events";
import type { GymEventInput } from "@/components/event-dialog";
import { EventDialog } from "@/components/event-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

type EventsListProps = {
  events: GymEventInput[];
};

function matchesSearch(event: GymEventInput, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return event.title.toLowerCase().includes(q);
}

function DeleteEventButton({ id, title }: { id: string; title: string }) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const router = useRouter();

  function onDelete() {
    startTransition(async () => {
      const result = await deleteEvent(id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Event removed.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1 text-destructive">
          <Trash2 className="h-4 w-4" /> Remove
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove event</DialogTitle>
          <DialogDescription>
            Remove &quot;{title}&quot;? This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button variant="destructive" onClick={onDelete} disabled={pending}>
            {pending ? "Removing..." : "Remove event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EventsList({ events }: EventsListProps) {
  const [query, setQuery] = React.useState("");
  const filtered = React.useMemo(
    () => events.filter((event) => matchesSearch(event, query)),
    [events, query],
  );

  return (
    <div className="space-y-4">
      <div className="relative w-full max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title…"
          className="pl-9"
          aria-label="Search events"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {events.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No events yet. Click &quot;Add event&quot; to schedule your first
              activity.
            </p>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No events match your search.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((event) => (
                  <TableRow key={event.id} className="hover-lift-row">
                    <TableCell className="min-w-[120px] max-w-[200px] px-3 py-3">
                      <p className="truncate font-medium">{event.title}</p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-3 font-mono">
                      {formatDate(event.eventDate)}
                    </TableCell>
                    <TableCell className="px-3 py-3">{event.location}</TableCell>
                    <TableCell className="max-w-[220px] px-3 py-3">
                      {event.description ? (
                        <p className="truncate text-sm text-muted-foreground">
                          {event.description}
                        </p>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <EventDialog
                          event={event}
                          trigger={
                            <Button variant="outline" size="sm">
                              Edit
                            </Button>
                          }
                        />
                        <DeleteEventButton id={event.id} title={event.title} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
