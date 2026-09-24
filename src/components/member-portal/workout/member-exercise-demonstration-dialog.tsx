"use client";

import { ImageIcon } from "lucide-react";

import { ExerciseMedia } from "@/components/exercise-media";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ExerciseMediaMetadata } from "@/lib/exercises/catalog-types";
import { cn } from "@/lib/utils";

type MemberExerciseDemonstrationDialogProps = {
  exerciseName: string;
  media: ExerciseMediaMetadata | null;
  hasMedia?: boolean;
  compact?: boolean;
  className?: string;
};

export function MemberExerciseDemonstrationDialog({
  exerciseName,
  media,
  hasMedia = false,
  compact = false,
  className,
}: MemberExerciseDemonstrationDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size={compact ? "sm" : "default"}
          className={cn(
            "max-w-full shrink-0 gap-1.5 text-muted-foreground",
            compact ? "h-8 px-2 text-xs" : "h-9 px-3 text-sm",
            className,
          )}
        >
          <ImageIcon className="h-4 w-4 shrink-0" aria-hidden />
          <span className="truncate">
            {hasMedia ? "View demonstration" : "No demonstration"}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] max-w-lg overflow-hidden sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="pr-8">{exerciseName}</DialogTitle>
        </DialogHeader>
        <div className="max-w-full overflow-hidden">
          <ExerciseMedia
            media={media}
            alt={`${exerciseName} demonstration`}
            variant="demonstration"
            className="aspect-[4/3] w-full max-w-full"
            imageClassName="max-h-[min(60vh,28rem)]"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
