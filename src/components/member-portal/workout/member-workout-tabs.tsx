"use client";

import { cn } from "@/lib/utils";

export type MemberWorkoutTab = "assigned" | "mine" | "library";

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
        "flex gap-1 rounded-xl bg-muted/60 p-1",
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
            "min-h-11 flex-1 rounded-lg px-2 text-sm font-medium transition-colors",
            value === tab.id
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground",
          )}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
