import type { MemberLibraryMuscleFilter } from "@/lib/member-portal/member-library-muscle-groups";
import { Activity, Heart } from "lucide-react";
import React from "react";
import { memberLibraryGroupLabel } from "@/lib/member-portal/member-library-muscle-groups";
import { memberMuscleGroupImageSrc } from "@/lib/member-portal/member-muscle-group-images";
import { cn } from "@/lib/utils";

type MemberMuscleGroupArtProps = {
  group: MemberLibraryMuscleFilter;
  className?: string;
};

/** Muscle-group card illustration from local static assets (icon fallback when no artwork). */
export function MemberMuscleGroupArt({
  group,
  className,
}: MemberMuscleGroupArtProps) {
  const src = memberMuscleGroupImageSrc(group);
  const label = memberLibraryGroupLabel(group);

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        aria-hidden
        draggable={false}
        className={cn("member-muscle-group-art", className)}
        title={label}
      />
    );
  }

  const Icon = group === "CARDIO" ? Heart : Activity;

  return (
    <span
      className={cn(
        "member-muscle-group-art member-muscle-group-art--icon flex h-full w-full items-center justify-center",
        className,
      )}
      title={label}
      aria-hidden
    >
      <Icon className="h-10 w-10 text-primary/80" strokeWidth={1.5} />
    </span>
  );
}
