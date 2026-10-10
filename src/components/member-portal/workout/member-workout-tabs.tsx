"use client";

import type { MemberWorkoutTab } from "@/lib/member-portal/member-workout-tab-url";
import { cn } from "@/lib/utils";

export type { MemberWorkoutTab };

const TABS: { id: MemberWorkoutTab; label: string }[] = [
  { id: "assigned", label: "Assigned" },
  { id: "mine", label: "My Workouts" },
  { id: "library", label: "Library" },
];

type MemberWorkoutTabsProps = {
  value: MemberWorkoutTab;
  onChange: (tab: MemberWorkoutTab) => void;
  className?: string;
};

export function MemberWorkoutTabs({
  value,
  onChange,
  className,
}: MemberWorkoutTabsProps) {
  return (
    <div
      className={cn(
        "flex gap-1 rounded-2xl border border-border/60 bg-card/40 p-1",
        className,
      )}
      role="tablist"
      aria-label="Workout sections"
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={value === tab.id}
          className={cn(
            "min-h-11 flex-1 rounded-xl px-2 text-sm font-semibold transition-all",
            value === tab.id
              ? "bg-primary text-primary-foreground shadow member-workout-glow"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
