"use client";

import * as React from "react";
import { memo } from "react";

import { toast } from "sonner";

import { updateMemberDailyWaterGoalAction } from "@/app/actions/member-dashboard";
import { MemberDashboardGoalDialog } from "@/components/member-portal/dashboard/member-dashboard-goal-dialog";
import { WaterGoalGlassVisual } from "@/components/member-portal/dashboard/water-goal-glass-visual";
import {
  clampWaterTargetDraftMl,
  MEMBER_DAILY_WATER_TARGET_MAX_ML,
  MEMBER_DAILY_WATER_TARGET_MIN_ML,
  MEMBER_DAILY_WATER_TARGET_SLIDER_STEP_ML,
} from "@/lib/member-portal/member-dashboard-goals";
import { cn } from "@/lib/utils";

function formatWaterGoalLitresPerDay(ml: number): string {
  return `${(ml / 1000).toFixed(2)} litres / day`;
}

const WaterGoalLitresReadout = memo(function WaterGoalLitresReadout({
  draftMl,
}: {
  draftMl: number;
}) {
  return (
    <p
      className="text-center text-[1.35rem] font-bold leading-tight tracking-tight text-foreground tabular-nums sm:text-[1.5rem]"
    >
      {formatWaterGoalLitresPerDay(draftMl)}
    </p>
  );
});

type WaterGoalEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consumedMl: number;
  savedTargetMl: number;
  onSaved: (targetMl: number) => void;
  returnFocusRef?: React.RefObject<HTMLButtonElement | null>;
};

export function WaterGoalEditDialog({
  open,
  onOpenChange,
  consumedMl: _consumedMl,
  savedTargetMl,
  onSaved,
  returnFocusRef,
}: WaterGoalEditDialogProps) {
  const sliderRef = React.useRef<HTMLInputElement>(null);
  const [draftMl, setDraftMl] = React.useState(savedTargetMl);
  const [saving, setSaving] = React.useState(false);
  const [isDraggingSlider, setIsDraggingSlider] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setDraftMl(savedTargetMl);
      setIsDraggingSlider(false);
    }
  }, [open, savedTargetMl]);

  const handleSliderValue = React.useCallback((raw: number) => {
    setDraftMl(clampWaterTargetDraftMl(raw));
  }, []);

  const onSliderInput = React.useCallback(
    (event: React.FormEvent<HTMLInputElement>) => {
      handleSliderValue(Number(event.currentTarget.value));
    },
    [handleSliderValue],
  );

  const endSliderDrag = React.useCallback(() => {
    setIsDraggingSlider(false);
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const result = await updateMemberDailyWaterGoalAction({ targetMl: draftMl });
      if (!result.ok) {
        toast.error(result.error ?? "Could not save water goal.");
        return;
      }
      const targetMl = result.data?.targetMl ?? draftMl;
      onSaved(targetMl);
      onOpenChange(false);
      toast.success(result.message ?? "Daily water goal saved.");
    } finally {
      setSaving(false);
    }
  }

  const sliderFill =
    ((draftMl - MEMBER_DAILY_WATER_TARGET_MIN_ML) /
      (MEMBER_DAILY_WATER_TARGET_MAX_ML - MEMBER_DAILY_WATER_TARGET_MIN_ML)) *
    100;

  return (
    <MemberDashboardGoalDialog
      open={open}
      onOpenChange={onOpenChange}
      eyebrow="Stay hydrated"
      title="Daily water goal"
      presentation="water"
      onSave={handleSave}
      saving={saving}
      returnFocusRef={returnFocusRef}
      initialFocusRef={sliderRef}
    >
      <div className="flex flex-col items-center gap-2 sm:gap-2.5">
        <WaterGoalGlassVisual
          targetMl={draftMl}
          smoothLevelMotion={!isDraggingSlider}
          className="h-[min(7.75rem,20dvh)] w-[min(4.75rem,12.5dvh)] sm:h-[8.5rem] sm:w-[5.25rem]"
        />
        <WaterGoalLitresReadout draftMl={draftMl} />
        <p className="text-center text-[11px] leading-snug text-muted-foreground/90">
          Adjust the amount you want to drink each day.
        </p>
      </div>

      <div className="space-y-1.5">
        <div className="relative px-0.5">
          <input
            ref={sliderRef}
            type="range"
            min={MEMBER_DAILY_WATER_TARGET_MIN_ML}
            max={MEMBER_DAILY_WATER_TARGET_MAX_ML}
            step={MEMBER_DAILY_WATER_TARGET_SLIDER_STEP_ML}
            value={draftMl}
            onInput={onSliderInput}
            onChange={onSliderInput}
            onPointerDown={() => setIsDraggingSlider(true)}
            onPointerUp={endSliderDrag}
            onPointerCancel={endSliderDrag}
            onBlur={endSliderDrag}
            className={cn(
              "goal-editor-water-range relative z-10 h-2 w-full cursor-pointer appearance-none bg-transparent",
            )}
            style={{
              background: `linear-gradient(to right, #8EDBFF 0%, #8EDBFF ${sliderFill}%, #3a4240 ${sliderFill}%, #3a4240 100%)`,
            }}
            aria-label="Daily water goal in milliliters"
            aria-valuemin={MEMBER_DAILY_WATER_TARGET_MIN_ML}
            aria-valuemax={MEMBER_DAILY_WATER_TARGET_MAX_ML}
            aria-valuenow={draftMl}
          />
        </div>
        <div className="flex justify-between text-[10px] font-medium text-muted-foreground/80">
          <span>500 ml</span>
          <span>6 L</span>
        </div>
      </div>
    </MemberDashboardGoalDialog>
  );
}
