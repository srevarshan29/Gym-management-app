"use client";

import * as React from "react";

import { MemberMuscleGroupArt } from "@/components/member-portal/workout/member-muscle-group-art";
import type { MemberLibraryMuscleFilter } from "@/lib/member-portal/member-library-muscle-groups";
import { memberLibraryGroupLabel } from "@/lib/member-portal/member-library-muscle-groups";
import { memberLibraryRegionModule } from "@/lib/member-portal/muscle-region-registry";
import { cn } from "@/lib/utils";

type MemberMuscleRegionGridProps = {
  group: MemberLibraryMuscleFilter;
  onSelect: (regionId: string) => void;
  onBrowseAll?: () => void;
  className?: string;
};

export function MemberMuscleRegionGrid({
  group,
  onSelect,
  onBrowseAll,
  className,
}: MemberMuscleRegionGridProps) {
  const module = memberLibraryRegionModule(group);
  if (!module) return null;

  const groupLabel = memberLibraryGroupLabel(group);

  return (
    <div className={cn("space-y-3", className)}>
      <div
        className="member-workout-card overflow-hidden"
        data-member-region-overview=""
      >
        <div className="member-muscle-group-art-wrap h-[5.5rem] w-full px-2 pt-2 sm:h-24">
          <MemberMuscleGroupArt group={group} />
        </div>
        <div className="border-t border-border/30 px-3 py-2">
          <p className="font-display text-sm font-bold">
            {module.pickerTitle || groupLabel}
          </p>
          <p className="text-xs text-muted-foreground">
            {module.pickerSubtitle}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-2.5">
        {module.regions.map((region) => (
          <button
            key={region.id}
            type="button"
            data-member-region-card={region.id}
            onClick={() => onSelect(region.id)}
            className={cn(
              "member-workout-card group relative flex flex-col overflow-hidden text-left transition-transform active:scale-[0.98]",
              "hover:member-workout-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            )}
          >
            <div className="member-muscle-group-art-wrap relative h-[4.5rem] w-full px-1.5 pt-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={region.imageSrc}
                alt=""
                aria-hidden
                draggable={false}
                className="member-muscle-group-art"
              />
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-card to-transparent"
                aria-hidden
              />
            </div>
            <div className="flex flex-col justify-center border-t border-border/30 px-2 py-2">
              <p className="font-display text-xs font-bold leading-tight sm:text-[13px]">
                {region.label}
              </p>
              <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground sm:text-[11px]">
                {region.subtitle}
              </p>
            </div>
          </button>
        ))}
      </div>

      {onBrowseAll ? (
        <button
          type="button"
          onClick={onBrowseAll}
          className="flex min-h-11 w-full items-center justify-center rounded-xl border border-dashed border-border/70 bg-card/40 px-3 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          {module.browseAllLabel}
        </button>
      ) : null}
    </div>
  );
}