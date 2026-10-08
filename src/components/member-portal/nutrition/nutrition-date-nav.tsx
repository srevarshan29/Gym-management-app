"use client";

import * as React from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { getMemberNutritionDay } from "@/app/actions/member-nutrition";
import { Button } from "@/components/ui/button";
import {
  defaultNutritionLogDate,
  formatNutritionInsightsLabel,
  parseNutritionLogDate,
  shiftNutritionLogDate,
} from "@/lib/nutrition/date-utils";
import { syncMemberNutritionDateUrl } from "@/lib/nutrition/nutrition-date-url";
import type { MemberNutritionDayView } from "@/lib/nutrition/member-day";
import { cn } from "@/lib/utils";

type NutritionDateNavProps = {
  logDate: string;
  onDayLoaded: (day: MemberNutritionDayView) => void;
  className?: string;
};

function openNativeDatePicker(input: HTMLInputElement | null) {
  if (!input) return;
  input.focus({ preventScroll: true });
  if (typeof input.showPicker === "function") {
    try {
      input.showPicker();
      return;
    } catch {
      // Safari / unsupported — fall through to click()
    }
  }
  input.click();
}

export function NutritionDateNav({
  logDate,
  onDayLoaded,
  className,
}: NutritionDateNavProps) {
  const today = React.useMemo(() => defaultNutritionLogDate(), []);
  const [loading, setLoading] = React.useState(false);
  const dateInputRef = React.useRef<HTMLInputElement>(null);
  const dateInputId = React.useId();

  async function navigateTo(nextDate: string) {
    if (loading || nextDate === logDate) return;
    setLoading(true);
    try {
      const result = await getMemberNutritionDay(nextDate);
      if (!result.ok || !result.data) {
        return;
      }
      onDayLoaded(result.data);
      syncMemberNutritionDateUrl(nextDate);
    } finally {
      setLoading(false);
    }
  }

  function onPickDate(value: string) {
    try {
      const parsed = parseNutritionLogDate(value);
      void navigateTo(parsed);
    } catch {
      // ignore invalid manual input
    }
  }

  const atToday = logDate === today;
  const insightsLabel = formatNutritionInsightsLabel(logDate, today);

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-xl bg-muted/40 px-2 py-2",
        className,
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-10 w-10 shrink-0"
        disabled={loading}
        aria-label="Previous day"
        onClick={() => void navigateTo(shiftNutritionLogDate(logDate, -1))}
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>

      <div className="min-w-0 flex-1 text-center">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Today&apos;s insights
        </p>
        <p className="truncate text-base font-semibold leading-tight">
          {insightsLabel}
        </p>
        <p className="text-xs text-muted-foreground">{logDate}</p>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-10 w-10 shrink-0"
        disabled={loading || atToday}
        aria-label="Next day"
        onClick={() => void navigateTo(shiftNutritionLogDate(logDate, 1))}
      >
        <ChevronRight className="h-5 w-5" />
      </Button>

      <div className="relative h-10 w-10 shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10"
          disabled={loading}
          aria-label="Pick date"
          onClick={() => openNativeDatePicker(dateInputRef.current)}
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <CalendarDays className="h-5 w-5" />
          )}
        </Button>
        {/* iOS: label-associated input receives touch; desktop uses Button + showPicker */}
        <input
          ref={dateInputRef}
          id={dateInputId}
          type="date"
          value={logDate}
          max={today}
          disabled={loading}
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 h-px w-px opacity-0"
          onChange={(e) => onPickDate(e.target.value)}
        />
        <label
          htmlFor={dateInputId}
          className="absolute inset-0 z-10 cursor-pointer [@media(pointer:fine)]:hidden"
          aria-label="Pick date"
        />
      </div>
    </div>
  );
}
