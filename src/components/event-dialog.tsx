"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImagePlus, Plus, Pencil, X } from "lucide-react";

import { createEvent, updateEvent } from "@/app/actions/events";
import { EventBanner } from "@/components/events/event-banner";
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
import { useGuardedFormAction } from "@/hooks/use-guarded-form-action";
import type { ActionResult } from "@/lib/action-result";
import { MAX_IMAGE_BYTES } from "@/lib/storage/image-validation";

export type GymEventInput = {
  id: string;
  title: string;
  eventDate: string;
  location: string;
  description: string | null;
  bannerImageUrl?: string | null;
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
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [removeBanner, setRemoveBanner] = React.useState(false);

  const action = isEdit ? updateEvent : createEvent;
  const guardedAction = useGuardedFormAction(action);
  const [state, formAction] = useFormState<ActionResult | undefined, FormData>(
    guardedAction,
    undefined,
  );

  React.useEffect(() => {
    if (!open) {
      setPreviewUrl((previous) => {
        if (previous?.startsWith("blob:")) {
          URL.revokeObjectURL(previous);
        }
        return null;
      });
      setRemoveBanner(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [open]);

  React.useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

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

  function onBannerFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image must be smaller than 5MB.");
      e.target.value = "";
      return;
    }
  setRemoveBanner(false);
    setPreviewUrl((previous) => {
      if (previous?.startsWith("blob:")) {
        URL.revokeObjectURL(previous);
      }
      return URL.createObjectURL(file);
    });
  }

  function clearBannerSelection() {
    setRemoveBanner(true);
    setPreviewUrl((previous) => {
      if (previous?.startsWith("blob:")) {
        URL.revokeObjectURL(previous);
      }
      return null;
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  const showExistingBanner =
    isEdit &&
    !removeBanner &&
    !previewUrl &&
    Boolean(event?.bannerImageUrl?.trim());

  const previewTitle = event?.title || "New event";
  const previewDate = event?.eventDate
    ? new Date(event.eventDate)
    : new Date(todayDateInputValue());
  const previewLocation = event?.location || "Gym";

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
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <form
          action={formAction}
          encType="multipart/form-data"
          className="space-y-4"
        >
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit event" : "Add event"}</DialogTitle>
            <DialogDescription>
              Workshops, competitions, open houses, and other gym activities.
            </DialogDescription>
          </DialogHeader>

          {event ? <input type="hidden" name="id" value={event.id} /> : null}
          <input
            type="hidden"
            name="removeBanner"
            value={removeBanner ? "1" : "0"}
          />

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

          <div className="space-y-2">
            <Label htmlFor="event-banner">Event banner (optional)</Label>
            <p className="text-xs text-muted-foreground">
              JPEG, PNG or WebP · up to 5 MB
            </p>
            {previewUrl ? (
              <div className="space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Banner preview"
                  className="max-h-40 w-full rounded-lg object-cover ring-1 ring-border"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearBannerSelection}
                >
                  <X className="mr-1 h-4 w-4" />
                  Remove selection
                </Button>
              </div>
            ) : showExistingBanner && event?.bannerImageUrl ? (
              <div className="space-y-2">
                <EventBanner
                  title={previewTitle}
                  eventDate={previewDate}
                  location={previewLocation}
                  bannerImageUrl={event.bannerImageUrl}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearBannerSelection}
                >
                  <X className="mr-1 h-4 w-4" />
                  Remove banner
                </Button>
              </div>
            ) : (
              <EventBanner
                title={previewTitle}
                eventDate={previewDate}
                location={previewLocation}
              />
            )}
            <Input
              ref={fileInputRef}
              id="event-banner"
              name="banner"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={onBannerFileChange}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-1"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus className="h-4 w-4" />
              Choose image
            </Button>
          </div>

          <DialogFooter>
            <SubmitButton label={isEdit ? "Save changes" : "Add event"} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
