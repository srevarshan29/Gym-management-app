"use client";

import * as React from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

import { updateMemberNutritionCalorieTarget } from "@/app/actions/member-nutrition";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MemberNutritionDayView } from "@/lib/nutrition/member-day";
import {
  MEMBER_DAILY_CALORIE_TARGET_MAX,
  MEMBER_DAILY_CALORIE_TARGET_MIN,
  nutritionCalorieTargetSourceLabel,
  parseValidDailyCalorieTarget,
} from "@/lib/nutrition/nutrition-calorie-target";
import { cn } from "@/lib/utils";

type NutritionDailyTargetControlProps = {
  day: MemberNutritionDayView;
  onDayUpdated: (day: MemberNutritionDayView) => void;
  className?: string;
};

export function NutritionDailyTargetControl({
  day,
  onDayUpdated,
  className,
}: NutritionDailyTargetControlProps) {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const sourceLabel = nutritionCalorieTargetSourceLabel(day.targetSource);
  const hasActiveTarget = day.targetCalories != null && day.targetCalories > 0;

  function openEditor() {
    const seed =
      day.memberDailyCalorieTarget ??
      day.targetCalories ??
      "";
    setValue(seed ? String(seed) : "");
    setOpen(true);
  }

  async function onSave() {
    const trimmed = value.trim();
    const parsed =
      trimmed.length === 0
        ? null
        : parseValidDailyCalorieTarget(Number(trimmed));

    if (trimmed.length > 0 && parsed == null) {
      toast.error(
        `Enter a target between ${MEMBER_DAILY_CALORIE_TARGET_MIN} and ${MEMBER_DAILY_CALORIE_TARGET_MAX} kcal.`,
      );
      return;
    }

    setSaving(true);
    try {
      const result = await updateMemberNutritionCalorieTarget({
        logDate: day.logDate,
        dailyCalorieTarget: parsed,
      });
      if (!result.ok || !result.data) {
        toast.error(result.ok ? "Could not save target." : result.error);
        return;
      }
      onDayUpdated(result.data);
      setOpen(false);
      toast.success(
        parsed == null ? "Personal target cleared." : "Daily target saved.",
      );
    } catch {
      toast.error("Could not save target.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div
        className={cn(
          "flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card px-3 py-2.5 shadow-sm",
          className,
        )}
      >
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Daily target
          </p>
          {hasActiveTarget ? (
            <>
              <p className="text-sm font-semibold tabular-nums">
                {day.targetCalories!.toLocaleString()} kcal
              </p>
              {sourceLabel ? (
                <p className="text-xs text-muted-foreground">{sourceLabel}</p>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No daily target set</p>
          )}
          {day.targetSource === "member" && day.gymDailyCalorieTarget != null ? (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Gym recommendation: {day.gymDailyCalorieTarget.toLocaleString()} kcal
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 shrink-0 gap-1.5"
          onClick={openEditor}
        >
          <Pencil className="h-3.5 w-3.5" />
          {day.memberDailyCalorieTarget != null ? "Edit" : "Set"}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[340px]">
          <DialogHeader>
            <DialogTitle>Your daily calorie target</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="member-calorie-target">kcal per day</Label>
            <Input
              id="member-calorie-target"
              type="number"
              inputMode="numeric"
              min={MEMBER_DAILY_CALORIE_TARGET_MIN}
              max={MEMBER_DAILY_CALORIE_TARGET_MAX}
              placeholder={`e.g. 2000`}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="text-base"
            />
            <p className="text-xs text-muted-foreground">
              {MEMBER_DAILY_CALORIE_TARGET_MIN.toLocaleString()}–
              {MEMBER_DAILY_CALORIE_TARGET_MAX.toLocaleString()} kcal. Leave empty
              and save to clear your personal target and use the gym target if
              assigned.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              disabled={saving}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" disabled={saving} onClick={() => void onSave()}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
