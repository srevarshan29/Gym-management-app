"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";

import { createEvent, updateEvent } from "@/app/actions/events";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action-result";

export type GymEventInput = {
  id: string;
  title: string;
  eventDate: string;
  location: string;
  description: string | null;
};

function toDateInputValue(value: string): string {
  return value.slice(0, 10);
}

function todayDateInputValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving..." : label}
    </Button>
  );
}

export function EventDialog({
  event,
  trigger,
}: {
  event?: GymEventInput;
  trigger?: React.ReactNode;
}) {
  const isEdit = Boolean(event);
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  const action = isEdit ? updateEvent : createEvent;
  const [state, formAction] = useFormState<ActionResult | undefined, FormData>(
    action,
    undefined,
  );

  React.useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message ?? "Saved.");
      setOpen(false);
      router.refresh();
    } else {
      toast.error(state.error);
    }
  }, [state, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ??
          (isEdit ? (
            <Button variant="ghost" size="sm" className="gap-1">
              <Pencil className="h-4 w-4" /> Edit
            </Button>
          ) : (
            <Button className="gap-1">
              <Plus className="h-4 w-4" /> Add event
            </Button>
          ))}
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit event" : "Add event"}</DialogTitle>
            <DialogDescription>
              Workshops, competitions, open houses, and other gym activities.
            </DialogDescription>
          </DialogHeader>

          {event ? <input type="hidden" name="id" value={event.id} /> : null}

          <div className="space-y-2">
            <Label htmlFor="event-title">Title</Label>
            <Input
              id="event-title"
              name="title"
              defaultValue={event?.title}
              placeholder="Summer fitness workshop"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-eventDate">Date</Label>
            <Input
              id="event-eventDate"
              name="eventDate"
              type="date"
              defaultValue={
                event
                  ? toDateInputValue(event.eventDate)
                  : todayDateInputValue()
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-location">Location</Label>
            <Input
              id="event-location"
              name="location"
              defaultValue={event?.location}
              placeholder="Main floor, Studio A"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-description">Description (optional)</Label>
            <Textarea
              id="event-description"
              name="description"
              defaultValue={event?.description ?? ""}
              placeholder="What members should know about this event"
            />
          </div>

          <DialogFooter>
            <SubmitButton label={isEdit ? "Save changes" : "Add event"} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
