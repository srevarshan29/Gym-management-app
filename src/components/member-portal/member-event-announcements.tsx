"use client";

import * as React from "react";
import Link from "next/link";

import { EventBanner } from "@/components/events/event-banner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  filterUndismissedAnnouncementEvents,
  type PortalEventRow,
} from "@/lib/events/event-scheduling";
import { formatDate } from "@/lib/utils";

const DISMISS_STORAGE_KEY = "gymdesk:event-announcements-dismissed";

export type MemberAnnouncementEvent = PortalEventRow;

function readDismissedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(DISMISS_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

function writeDismissedIds(ids: Set<string>) {
  sessionStorage.setItem(DISMISS_STORAGE_KEY, JSON.stringify([...ids]));
}

export function MemberEventAnnouncements({
  events,
}: {
  events: MemberAnnouncementEvent[];
}) {
  const [dismissed, setDismissed] = React.useState<Set<string> | null>(null);
  const [queue, setQueue] = React.useState<MemberAnnouncementEvent[]>([]);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const stored = readDismissedIds();
    setDismissed(stored);
    const pending = filterUndismissedAnnouncementEvents(events, stored);
    setQueue(pending);
    setOpen(pending.length > 0);
  }, [events]);

  const current = queue[0] ?? null;

  function dismissCurrent() {
    if (!current || !dismissed) return;
    const nextDismissed = new Set(dismissed);
    nextDismissed.add(current.id);
    writeDismissedIds(nextDismissed);
    setDismissed(nextDismissed);
    const remaining = queue.filter((e) => e.id !== current.id);
    setQueue(remaining);
    setOpen(remaining.length > 0);
  }

  if (!current || !open) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && dismissCurrent()}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0 sm:max-w-lg">
        <EventBanner
          title={current.title}
          eventDate={current.eventDate}
          location={current.location}
          description={current.description}
          bannerImageUrl={current.bannerImageUrl}
          variant="hero"
          className="rounded-none rounded-t-lg"
        />
        <div className="space-y-3 p-4 pt-3">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-lg leading-tight">
              {current.title}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {formatDate(current.eventDate)} · {current.location}
            </DialogDescription>
          </DialogHeader>
          {current.description ? (
            <p className="text-sm text-muted-foreground">{current.description}</p>
          ) : null}
          <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
            <Button type="button" className="w-full" onClick={dismissCurrent}>
              Got it
            </Button>
            <Button variant="ghost" className="w-full" asChild>
              <Link href="/member/events" onClick={dismissCurrent}>
                View all events
              </Link>
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
