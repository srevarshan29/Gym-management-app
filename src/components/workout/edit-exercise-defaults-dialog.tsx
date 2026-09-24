"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

import { updateExerciseDefaults } from "@/app/actions/exercises";
import { ExerciseMediaPanel } from "@/components/workout/exercise-media-panel";
import { useActionLock } from "@/hooks/use-action-lock";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ExerciseListItem } from "@/lib/workout-tracking/types";

type EditExerciseDefaultsDialogProps = {
  exercise: ExerciseListItem;
  canUploadMedia: boolean;
};

export function EditExerciseDefaultsDialog({
  exercise,
  canUploadMedia,
}: EditExerciseDefaultsDialogProps) {
  const router = useRouter();
  const { run, isPending } = useActionLock();
  const [open, setOpen] = React.useState(false);
  const [trackingType, setTrackingType] = React.useState(exercise.trackingType);

  React.useEffect(() => {
    if (open) {
      setTrackingType(exercise.trackingType);
    }
  }, [exercise.trackingType, open]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;

    const formData = new FormData(event.currentTarget);
    await run(async () => {
      try {
        const result = await updateExerciseDefaults({
          id: exercise.id,
          defaultSets: formData.get("defaultSets")
            ? Number(formData.get("defaultSets"))
            : null,
          defaultReps: String(formData.get("defaultReps") ?? ""),
          defaultTempo: String(formData.get("defaultTempo") ?? ""),
          defaultRestSeconds: formData.get("defaultRestSeconds")
            ? Number(formData.get("defaultRestSeconds"))
            : null,
          trackingType,
        });

        if (!result.ok) {
          toast.error(result.error);
          return;
        }

        toast.success(result.message ?? "Exercise updated.");
        setOpen(false);
        router.refresh();
      } catch (error) {
        console.error("[exercises] updateExerciseDefaults failed:", error);
        toast.error("Could not update exercise defaults.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="gap-1">
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={onSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Edit exercise</DialogTitle>
            <DialogDescription>
              {exercise.exerciseSource === "CATALOG"
                ? "Update plan defaults for this catalog exercise. Name and catalog metadata stay linked to the master catalog."
                : "Update defaults and optional demonstration images for this custom exercise."}
            </DialogDescription>
          </DialogHeader>

          <ExerciseMediaPanel exercise={exercise} canUploadMedia={canUploadMedia} />
          <div className="space-y-2">
            <Label>Exercise</Label>
            <Input value={exercise.name} disabled />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor={`default-sets-${exercise.id}`}>Default sets</Label>
              <Input
                id={`default-sets-${exercise.id}`}
                name="defaultSets"
                type="number"
                min={1}
                max={20}
                defaultValue={exercise.defaultSets ?? undefined}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`default-reps-${exercise.id}`}>Default reps</Label>
              <Input
                id={`default-reps-${exercise.id}`}
                name="defaultReps"
                defaultValue={exercise.defaultReps ?? ""}
                placeholder="8-12"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor={`default-tempo-${exercise.id}`}>Default tempo</Label>
              <Input
                id={`default-tempo-${exercise.id}`}
                name="defaultTempo"
                defaultValue={exercise.defaultTempo ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`default-rest-${exercise.id}`}>Rest (seconds)</Label>
              <Input
                id={`default-rest-${exercise.id}`}
                name="defaultRestSeconds"
                type="number"
                min={0}
                max={600}
                defaultValue={exercise.defaultRestSeconds ?? undefined}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`tracking-${exercise.id}`}>Tracking</Label>
            <Select value={trackingType} onValueChange={(value) => setTrackingType(value as typeof trackingType)}>
              <SelectTrigger id={`tracking-${exercise.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WEIGHTED">Weighted</SelectItem>
                <SelectItem value="BODYWEIGHT">Bodyweight</SelectItem>
                <SelectItem value="TIME">Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save defaults"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
