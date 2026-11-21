import { Lock } from "lucide-react";

import { PERSONAL_WORKOUTS_LOCKED_MESSAGE } from "@/lib/member-portal/personal-workouts-policy";

export function MemberPersonalWorkoutsLocked({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <div
      className={
        compact
          ? "flex items-start gap-2 rounded-xl border border-dashed border-border/70 bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground"
          : "rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center"
      }
    >
      <Lock
        className={compact ? "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" : "mx-auto mb-2 h-8 w-8 text-muted-foreground"}
        aria-hidden
      />
      <p className={compact ? "text-left leading-snug" : "text-sm text-muted-foreground"}>
        {PERSONAL_WORKOUTS_LOCKED_MESSAGE}
      </p>
    </div>
  );
}
