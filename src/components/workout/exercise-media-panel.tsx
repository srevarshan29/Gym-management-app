"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";

import { uploadExerciseDemonstrationImage } from "@/app/actions/exercise-media";
import { ExerciseMedia } from "@/components/exercise-media";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGuardedFormAction } from "@/hooks/use-guarded-form-action";
import type { ActionResult } from "@/lib/action-result";
import type { ExerciseMediaMetadata } from "@/lib/exercises/catalog-types";
import { buildGymExerciseMediaMetadataPatch } from "@/lib/exercises/media-storage";
import { isCustomExerciseMediaUploadTarget } from "@/lib/permissions";
import { MAX_IMAGE_BYTES, validateImageUploadFile } from "@/lib/storage/image-validation";
import type { ExerciseListItem } from "@/lib/workout-tracking/types";

type UploadMediaResult = ActionResult<{
  publicUrl: string;
  pose: "primary" | "secondary" | "thumbnail";
}>;

type ExerciseMediaPanelProps = {
  exercise: ExerciseListItem;
  canUploadMedia: boolean;
};

function UploadSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending} className="gap-1">
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
      {pending ? "Uploading..." : "Upload image"}
    </Button>
  );
}

export function ExerciseMediaPanel({
  exercise,
  canUploadMedia,
}: ExerciseMediaPanelProps) {
  const router = useRouter();
  const guardedAction = useGuardedFormAction(uploadExerciseDemonstrationImage);
  const [state, formAction] = useFormState<UploadMediaResult | undefined, FormData>(
    guardedAction,
    undefined,
  );
  const [media, setMedia] = React.useState<ExerciseMediaMetadata | null>(exercise.media);
  const [pose, setPose] = React.useState<"primary" | "secondary">("primary");
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const uploadAllowed = canUploadMedia && isCustomExerciseMediaUploadTarget(exercise);

  React.useEffect(() => {
    setMedia(exercise.media);
  }, [exercise.media]);

  React.useEffect(() => {
    if (!state) return;
    if (state.ok && state.data) {
      toast.success(state.message ?? "Exercise media uploaded.");
      setMedia((current) =>
        buildGymExerciseMediaMetadataPatch({
          pose: state.data!.pose,
          publicUrl: state.data!.publicUrl,
          existing: current,
        }),
      );
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
      return;
    }
    if (!state.ok) {
      toast.error(state.error);
    }
  }, [router, state]);

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const validated = validateImageUploadFile(file);
    if (!validated.ok) {
      toast.error(validated.error);
      event.target.value = "";
      setPreviewUrl(null);
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image must be smaller than 5MB.");
      event.target.value = "";
      setPreviewUrl(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-muted/10 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium">Demonstration media</p>
        {exercise.hasMedia ? (
          <Badge variant="outline">Has demo image</Badge>
        ) : (
          <Badge variant="secondary">No demo image</Badge>
        )}
        {exercise.exerciseSource === "CATALOG" ? (
          <Badge variant="outline">Catalog source</Badge>
        ) : exercise.exerciseSource === "CUSTOM" ? (
          <Badge variant="outline">Custom source</Badge>
        ) : (
          <Badge variant="secondary">Starter</Badge>
        )}
      </div>

      <ExerciseMedia
        media={media}
        alt={`${exercise.name} demonstration`}
        variant="demonstration"
        className="aspect-video w-full max-w-sm"
      />

      {previewUrl ? (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Selected file preview</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Selected upload preview"
            className="max-h-32 rounded-md border object-contain"
          />
        </div>
      ) : null}

      {uploadAllowed ? (
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="exerciseId" value={exercise.id} />
          <input type="hidden" name="pose" value={pose} />
          <div className="grid gap-3 sm:grid-cols-[180px_1fr] sm:items-end">
            <div className="space-y-2">
              <Label htmlFor={`media-pose-${exercise.id}`}>Image role</Label>
              <Select
                value={pose}
                onValueChange={(value) => setPose(value as typeof pose)}
              >
                <SelectTrigger id={`media-pose-${exercise.id}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary demonstration</SelectItem>
                  <SelectItem value="secondary">Secondary pose</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`media-file-${exercise.id}`}>Image file</Label>
              <input
                ref={fileInputRef}
                id={`media-file-${exercise.id}`}
                name="file"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm"
                onChange={onFileChange}
                required
              />
              <p className="text-xs text-muted-foreground">
                JPEG, PNG, WebP, or GIF up to 5MB.
              </p>
            </div>
          </div>
          <UploadSubmitButton />
        </form>
      ) : exercise.exerciseSource === "CATALOG" ? (
        <p className="text-xs text-muted-foreground">
          Catalog demonstration images are managed by the platform catalog and cannot be
          replaced from your gym library.
        </p>
      ) : exercise.isSeeded ? (
        <p className="text-xs text-muted-foreground">
          Starter exercises use the built-in library and cannot receive custom uploads.
        </p>
      ) : !canUploadMedia ? (
        <p className="text-xs text-muted-foreground">
          Only owners and admins can upload custom exercise demonstration images.
        </p>
      ) : null}
    </div>
  );
}
