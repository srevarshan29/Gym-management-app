"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { addExerciseToPersonalWorkoutAction } from "@/app/actions/member-personal-workouts";
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
  className?: string;
};

export function MemberExerciseCard({
  item,
  addToWorkoutId,
  group,
  selectionMode = false,
  className,
}: MemberExerciseCardProps) {
  const [adding, setAdding] = React.useState(false);
  const workoutId = addToWorkoutId?.trim() ?? "";
  const pickMode = selectionMode && workoutId.length > 0;

  const cardClass = cn(
    "member-workout-card flex flex-col overflow-hidden text-left transition-transform active:scale-[0.98]",
    pickMode && "cursor-pointer ring-0 hover:ring-2 hover:ring-primary/40",
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
            className="absolute bottom-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow"
            aria-hidden
          >
            {adding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
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
          <p className="text-[10px] font-medium text-primary">Tap to add</p>
        ) : null}
      </div>
    </>
  );

  async function onPickAdd() {
    if (!workoutId || adding) return;
    setAdding(true);
    try {
      const result = await addExerciseToPersonalWorkoutAction({
        workoutId,
        catalogId: item.catalogId,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`${item.name} added.`);
    } finally {
      setAdding(false);
    }
  }

  if (pickMode) {
    return (
      <div className={cn(cardClass, "relative")}>
        <button
          type="button"
          className="flex h-full w-full flex-col text-left"
          disabled={adding}
          onClick={() => void onPickAdd()}
        >
          {body}
        </button>
        <Link
          href={memberExerciseLibraryDetailHref(item.catalogId, {
            addToWorkoutId: workoutId,
            group,
          })}
          className="absolute right-2 top-2 rounded-md bg-card/90 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
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
