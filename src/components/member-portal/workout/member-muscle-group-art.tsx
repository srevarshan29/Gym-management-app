import type { MemberLibraryMuscleFilter } from "@/lib/member-portal/member-library-muscle-groups";
import React from "react";
import { memberLibraryGroupLabel } from "@/lib/member-portal/member-library-muscle-groups";
import { memberMuscleGroupImageSrc } from "@/lib/member-portal/member-muscle-group-images";
import { cn } from "@/lib/utils";

type MemberMuscleGroupArtProps = {
  group: MemberLibraryMuscleFilter;
  className?: string;
};

/** Muscle-group card illustration from local static assets. */
export function MemberMuscleGroupArt({
  group,
  className,
}: MemberMuscleGroupArtProps) {
  const src = memberMuscleGroupImageSrc(group);
  const label = memberLibraryGroupLabel(group);

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
