"use client";

import { MemberMuscleGroupArt } from "@/components/member-portal/workout/member-muscle-group-art";
import {
  MEMBER_LIBRARY_MUSCLE_GROUPS,
  type MemberLibraryMuscleFilter,
} from "@/lib/member-portal/member-library-muscle-groups";
import { cn } from "@/lib/utils";

type MemberMuscleGroupGridProps = {
  onSelect: (group: MemberLibraryMuscleFilter) => void;
  className?: string;
};

export function MemberMuscleGroupGrid({
  onSelect,
  className,
}: MemberMuscleGroupGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-2.5 lg:grid-cols-4 lg:gap-3",
        className,
      )}
    >
      {MEMBER_LIBRARY_MUSCLE_GROUPS.map((group) => (
        <button
          key={group.id}
          type="button"
          onClick={() => onSelect(group.id)}
          className={cn(
            "member-workout-card group relative flex flex-col overflow-hidden text-left transition-transform active:scale-[0.98]",
            "hover:member-workout-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          )}
        >
          <div className="member-muscle-group-art-wrap h-[4.5rem] w-full px-1.5 pt-1">
            <MemberMuscleGroupArt group={group.id} />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-card to-transparent"
              aria-hidden
            />
          </div>
          <div className="flex flex-col justify-center border-t border-border/30 px-2 py-1.5">
            <p className="font-display text-xs font-bold leading-tight sm:text-[13px]">
              {group.label}
            </p>
            <p className="mt-0.5 line-clamp-1 text-[10px] leading-snug text-muted-foreground sm:text-[11px]">
              {group.subtitle}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}
