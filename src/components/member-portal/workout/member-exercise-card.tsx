"use client";

import * as React from "react";
import Link from "next/link";
import { Check } from "lucide-react";

import type { MemberLibraryMuscleFilter } from "@/lib/member-portal/member-library-muscle-groups";
import { memberExerciseLibraryDetailHref } from "@/lib/member-portal/member-workout-tab-url";
import { muscleGroupLabel } from "@/lib/muscle-groups";
import type { MemberCatalogListItem } from "@/lib/workout-tracking/member-catalog-exercises";
import { cn } from "@/lib/utils";

type MemberExerciseCardProps = {
  item: MemberCatalogListItem;
  addToWorkoutId?: string | null;
  group?: MemberLibraryMuscleFilter | null;
  selectionMode?: boolean;
  multiSelect?: boolean;
  selected?: boolean;
  onToggleSelect?: (catalogId: string) => void;
  className?: string;
};

export function MemberExerciseCard({
  item,
  addToWorkoutId,
  group,
  selectionMode = false,
  multiSelect = false,
  selected = false,
  onToggleSelect,
  className,
}: MemberExerciseCardProps) {
  const workoutId = addToWorkoutId?.trim() ?? "";
  const pickMode = selectionMode && workoutId.length > 0 && multiSelect;

  const cardClass = cn(
    "member-workout-card flex flex-col overflow-hidden text-left transition-transform active:scale-[0.98]",
    pickMode && "cursor-pointer ring-0 hover:ring-2 hover:ring-primary/40",
    pickMode && selected && "ring-2 ring-primary",
    className,
  );

  const body = (
    <>
      <div className="relative aspect-[4/3] w-full bg-muted/30">
        {item.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.thumbnailUrl}
            alt=""
            className="h-full w-full object-contain p-2"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            No preview
          </div>
        )}
        {pickMode ? (
          <span
            className={cn(
              "absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-md border-2 shadow-sm",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border/80 bg-card/95 text-transparent",
            )}
            aria-hidden
          >
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-0.5 p-2 sm:p-3">
        <p className="line-clamp-2 text-sm font-semibold leading-snug">
          {item.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {muscleGroupLabel(item.muscleGroup)}
          {item.equipment ? ` · ${item.equipment}` : ""}
        </p>
        {pickMode ? (
          <p className="text-[10px] font-medium text-primary">
            {selected ? "Selected" : "Tap to select"}
          </p>
        ) : null}
      </div>
    </>
  );

  if (pickMode) {
    return (
      <div className={cn(cardClass, "relative")}>
        <button
          type="button"
          className="flex h-full w-full flex-col text-left"
          aria-pressed={selected}
          onClick={() => onToggleSelect?.(item.catalogId)}
        >
          {body}
        </button>
        <Link
          href={memberExerciseLibraryDetailHref(item.catalogId, {
            addToWorkoutId: workoutId,
            group,
          })}
          className="absolute right-2 top-2 z-10 rounded-md bg-card/90 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          Details
        </Link>
      </div>
    );
  }

  return (
    <Link
      href={memberExerciseLibraryDetailHref(item.catalogId, { group })}
      className={cardClass}
    >
      {body}
    </Link>
  );
}
