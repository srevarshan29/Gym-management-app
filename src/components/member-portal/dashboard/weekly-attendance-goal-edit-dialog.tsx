"use client";

import * as React from "react";

import { toast } from "sonner";

import { updateMemberWeeklyAttendanceGoalAction } from "@/app/actions/member-dashboard";
import {
  GOAL_EDITOR_PRESET_BUTTON_CLASS,
  MemberDashboardGoalDialog,
} from "@/components/member-portal/dashboard/member-dashboard-goal-dialog";
import { WeeklyActivityRingVisual } from "@/components/member-portal/dashboard/weekly-activity-ring-visual";
import { Button } from "@/components/ui/button";
import {
  MEMBER_WEEKLY_ATTENDANCE_TARGET_MAX,
  MEMBER_WEEKLY_ATTENDANCE_TARGET_MIN,
} from "@/lib/member-portal/member-dashboard-goals";
import { cn } from "@/lib/utils";

type WeeklyAttendanceGoalEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visitsThisWeek: number;
  savedTargetDays: number;
  onSaved: (targetDays: number) => void;
  returnFocusRef?: React.RefObject<HTMLButtonElement | null>;
};

export function WeeklyAttendanceGoalEditDialog({
  open,
  onOpenChange,
  visitsThisWeek,
  savedTargetDays,
  onSaved,
  returnFocusRef,
}: WeeklyAttendanceGoalEditDialogProps) {
  const sliderRef = React.useRef<HTMLInputElement>(null);
  const [draftDays, setDraftDays] = React.useState(savedTargetDays);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setDraftDays(savedTargetDays);
    }
  }, [open, savedTargetDays]);

  async function handleSave() {
    setSaving(true);
    try {
      const result = await updateMemberWeeklyAttendanceGoalAction({
        targetDays: draftDays,
      });
      if (!result.ok) {
        toast.error(result.error ?? "Could not save weekly goal.");
        return;
      }
      const targetDays = result.data?.targetDays ?? draftDays;
      onSaved(targetDays);
      onOpenChange(false);
      toast.success(result.message ?? "Weekly gym goal saved.");
    } finally {
      setSaving(false);
    }
  }

  const sliderFill =
    ((draftDays - MEMBER_WEEKLY_ATTENDANCE_TARGET_MIN) /
      (MEMBER_WEEKLY_ATTENDANCE_TARGET_MAX - MEMBER_WEEKLY_ATTENDANCE_TARGET_MIN)) *
    100;

  return (
    <MemberDashboardGoalDialog
      open={open}
      onOpenChange={onOpenChange}
      eyebrow="Build your routine"
      title="Weekly gym goal"
      presentation="weekly"
      onSave={handleSave}
      saving={saving}
      returnFocusRef={returnFocusRef}
      initialFocusRef={sliderRef}
    >
      <WeeklyActivityRingVisual
        targetDays={draftDays}
        visitsThisWeek={visitsThisWeek}
        interactive
        onSelectTarget={setDraftDays}
        className="w-[min(8.75rem,24vw)] max-h-[min(8.75rem,20dvh)] sm:w-[9.25rem]"
      />

      <p className="text-center text-[11px] leading-snug text-muted-foreground/90">
        Build a routine that suits your week.
      </p>

      <div className="grid w-full grid-cols-7 gap-1">
        {Array.from({ length: 7 }, (_, i) => i + 1).map((day) => (
          <Button
            key={day}
            type="button"
            variant="outline"
            className={cn(
              GOAL_EDITOR_PRESET_BUTTON_CLASS,
              "h-8 min-w-0 w-full rounded-lg px-0 text-xs tabular-nums sm:h-9 sm:text-sm",
              draftDays === day &&
                "border-primary/50 bg-primary text-primary-foreground shadow-[0_0_12px_rgba(190,255,0,0.3)] hover:bg-primary/90",
            )}
            onClick={() => setDraftDays(day)}
            aria-label={`${day} days per week`}
            aria-pressed={draftDays === day}
          >
            {day}
          </Button>
        ))}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground/90 sm:text-[11px]">
          <span>Weekly target</span>
          <span className="tabular-nums text-foreground/90">
            {draftDays} of 7 days
          </span>
        </div>
        <div className="relative px-0.5">
          <input
            ref={sliderRef}
            type="range"
            min={MEMBER_WEEKLY_ATTENDANCE_TARGET_MIN}
            max={MEMBER_WEEKLY_ATTENDANCE_TARGET_MAX}
            step={1}
            value={draftDays}
            onChange={(e) => setDraftDays(Number(e.target.value))}
            className="goal-editor-weekly-range relative z-10 h-2 w-full cursor-pointer appearance-none bg-transparent"
            style={{
              background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${sliderFill}%, #3a4240 ${sliderFill}%, #3a4240 100%)`,
            }}
            aria-label="Weekly gym visits goal"
            aria-valuemin={MEMBER_WEEKLY_ATTENDANCE_TARGET_MIN}
            aria-valuemax={MEMBER_WEEKLY_ATTENDANCE_TARGET_MAX}
            aria-valuenow={draftDays}
          />
        </div>
        <div className="flex justify-between text-[10px] font-medium text-muted-foreground/80">
          <span>1 day</span>
          <span>7 days</span>
        </div>
      </div>
    </MemberDashboardGoalDialog>
  );
}
