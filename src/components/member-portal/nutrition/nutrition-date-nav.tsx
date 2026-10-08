"use client";

import * as React from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { getMemberNutritionDay } from "@/app/actions/member-nutrition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  defaultNutritionLogDate,
  formatNutritionInsightsLabel,
  parseNutritionLogDate,
  shiftNutritionLogDate,
} from "@/lib/nutrition/date-utils";
import type { MemberNutritionDayView } from "@/lib/nutrition/member-day";
import { cn } from "@/lib/utils";

type NutritionDateNavProps = {
  logDate: string;
  onDayLoaded: (day: MemberNutritionDayView) => void;
  className?: string;
};

export function NutritionDateNav({
  logDate,
  onDayLoaded,
  className,
}: NutritionDateNavProps) {
  const router = useRouter();
  const today = React.useMemo(() => defaultNutritionLogDate(), []);
  const [loading, setLoading] = React.useState(false);
  const dateInputRef = React.useRef<HTMLInputElement>(null);

  async function navigateTo(nextDate: string) {
    if (loading || nextDate === logDate) return;
    setLoading(true);
    try {
      const result = await getMemberNutritionDay(nextDate);
      if (!result.ok || !result.data) {
        return;
      }
      onDayLoaded(result.data);
      router.replace(`/member/nutrition?date=${nextDate}`, { scroll: false });
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

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-10 w-10 shrink-0"
        disabled={loading}
        aria-label="Pick date"
        onClick={() => dateInputRef.current?.showPicker?.()}
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <CalendarDays className="h-5 w-5" />
        )}
      </Button>

      <Input
        ref={dateInputRef}
        type="date"
        value={logDate}
        max={today}
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => onPickDate(e.target.value)}
      />
    </div>
  );
}
