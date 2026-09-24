"use client";

import * as React from "react";
import { Dumbbell } from "lucide-react";

import type { ExerciseMediaMetadata } from "@/lib/exercises/catalog-types";
import {
  resolveDemonstrationImageUrl,
  resolveListPreviewImageUrl,
  resolveSecondaryDemonstrationImageUrl,
} from "@/lib/exercises/media-validation";
import { cn } from "@/lib/utils";

type ExerciseMediaProps = {
  media?: ExerciseMediaMetadata | null;
  alt: string;
  className?: string;
  imageClassName?: string;
  variant?: "demonstration" | "thumbnail";
  emptyLabel?: string;
  compact?: boolean;
};

export function ExerciseMedia({
  media,
  alt,
  className,
  imageClassName,
  variant = "demonstration",
  emptyLabel = "No demonstration image",
  compact = false,
}: ExerciseMediaProps) {
  const primaryUrl =
    variant === "thumbnail"
      ? resolveListPreviewImageUrl(media)
      : resolveDemonstrationImageUrl(media);
  const secondaryUrl = resolveSecondaryDemonstrationImageUrl(media, primaryUrl);

  const [primaryFailed, setPrimaryFailed] = React.useState(false);
  const [secondaryFailed, setSecondaryFailed] = React.useState(false);

  React.useEffect(() => {
    setPrimaryFailed(false);
    setSecondaryFailed(false);
  }, [primaryUrl, secondaryUrl]);

  const showPrimary = Boolean(primaryUrl) && !primaryFailed;
  const showSecondary = !showPrimary && Boolean(secondaryUrl) && !secondaryFailed;
  const displayUrl = showPrimary ? primaryUrl : showSecondary ? secondaryUrl : null;

  if (!displayUrl) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/30 text-muted-foreground",
          compact ? "p-2" : "px-4 py-6",
          className,
        )}
      >
        <div
          className={cn(
            "flex flex-col items-center text-center",
            compact ? "gap-1" : "gap-2",
          )}
        >
          <Dumbbell className={cn(compact ? "h-4 w-4" : "h-5 w-5")} aria-hidden />
          {!compact && emptyLabel ? (
            <p className="text-xs">{emptyLabel}</p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border/60 bg-muted/20",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={displayUrl}
        alt={alt}
        className={cn("h-full w-full object-contain object-center", imageClassName)}
        loading="lazy"
        onError={() => {
          if (displayUrl === primaryUrl) setPrimaryFailed(true);
          else if (displayUrl === secondaryUrl) setSecondaryFailed(true);
        }}
      />
    </div>
  );
}
