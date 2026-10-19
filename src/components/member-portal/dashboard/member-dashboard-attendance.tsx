"use client";



import { useCallback, useMemo, useState, useTransition } from "react";

import { ChevronRight } from "lucide-react";



import { loadMemberAttendanceMonthAction } from "@/app/actions/member-dashboard";

import { DashboardPercentRing } from "@/components/member-portal/dashboard/dashboard-percent-ring";

import type { MemberDashboardWeekDay } from "@/lib/member-portal/load-member-portal-dashboard";

import { weeklyAttendanceDisplayProgress } from "@/lib/member-portal/weekly-attendance-display";

import { attendanceDateKey } from "@/lib/attendance/date-key";

import { Card, CardContent } from "@/components/ui/card";

import {

  Dialog,

  DialogContent,

  DialogHeader,

  DialogTitle,

} from "@/components/ui/dialog";

import { cn } from "@/lib/utils";



const CARD_CLASS =

  "rounded-2xl border border-border/60 bg-card/90 shadow-soft ring-1 ring-border/50 backdrop-blur-sm";



function calendarCells(

  year: number,

  monthIndex0: number,

  visitKeys: Set<string>,

  todayKey: string,

): { day: number | null; dateKey: string | null; visited: boolean; isToday: boolean }[] {

  const firstWeekday = new Date(Date.UTC(year, monthIndex0, 1)).getUTCDay();

  const mon0 = (firstWeekday + 6) % 7;

  const daysInMonth = new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();

  const cells: {

    day: number | null;

    dateKey: string | null;

    visited: boolean;

    isToday: boolean;

  }[] = [];



  for (let i = 0; i < mon0; i++) {

    cells.push({ day: null, dateKey: null, visited: false, isToday: false });

  }

  for (let day = 1; day <= daysInMonth; day++) {

    const dateKey = `${year}-${String(monthIndex0 + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    cells.push({

      day,

      dateKey,

      visited: visitKeys.has(dateKey),

      isToday: dateKey === todayKey,

    });

  }

  return cells;

}



export function MemberDashboardAttendanceSection({

  weekDays,

  visitsThisWeek,

  initialYear,

  initialMonthIndex0,

}: {

  weekDays: MemberDashboardWeekDay[];

  visitsThisWeek: number;

  initialYear: number;

  initialMonthIndex0: number;

}) {

  const [open, setOpen] = useState(false);

  const [pending, startTransition] = useTransition();

  const [monthLabel, setMonthLabel] = useState("");

  const [visitCount, setVisitCount] = useState<number | null>(null);

  const [avgPerWeek, setAvgPerWeek] = useState<number | null>(null);

  const [visitKeys, setVisitKeys] = useState<string[]>([]);

  const [viewYear, setViewYear] = useState(initialYear);

  const [viewMonth, setViewMonth] = useState(initialMonthIndex0);



  const todayKey = useMemo(() => attendanceDateKey(), []);



  const loadMonth = useCallback((year: number, monthIndex0: number) => {

    startTransition(async () => {

      const result = await loadMemberAttendanceMonthAction({

        year,

        monthIndex0,

      });

      if (!result.ok || !result.data) return;

      setMonthLabel(result.data.monthLabel);

      setVisitCount(result.data.visitCount);

      setAvgPerWeek(result.data.averageVisitsPerWeek);

      setVisitKeys(result.data.visitDateKeys);

      setViewYear(result.data.year);

      setViewMonth(result.data.monthIndex0);

    });

  }, []);



  const openModal = () => {

    setOpen(true);

    loadMonth(initialYear, initialMonthIndex0);

  };



  const visitSet = useMemo(() => new Set(visitKeys), [visitKeys]);

  const cells = useMemo(

    () => calendarCells(viewYear, viewMonth, visitSet, todayKey),

    [viewYear, viewMonth, visitSet, todayKey],

  );

  const weekly = weeklyAttendanceDisplayProgress(visitsThisWeek);



  return (

    <>

      <button type="button" onClick={openModal} className="w-full min-w-0 text-left">

        <Card className={cn(CARD_CLASS, "transition-colors hover:bg-card")}>

          <CardContent className="space-y-3 p-3.5">

            <div className="flex items-center justify-between gap-2">

              <p className="text-sm font-semibold tracking-tight">Weekly goal</p>

              <span className="flex items-center gap-0.5 text-xs font-medium text-muted-foreground">

                Month

                <ChevronRight className="h-3.5 w-3.5" aria-hidden />

              </span>

            </div>



            <div className="flex min-w-0 items-center gap-3">

              <DashboardPercentRing

                percent={weekly.percent}

                size={76}

                strokeWidth={6}

                centerTop={String(weekly.visits)}

                centerBottom={`of ${weekly.benchmark}`}

              />

              <div className="min-w-0 flex-1">

                {weekly.remaining > 0 ? (

                  <p className="text-base font-semibold tabular-nums text-primary">

                    {weekly.remaining} to go

                  </p>

                ) : (

                  <p className="text-base font-semibold text-primary">Goal reached</p>

                )}

                <p className="mt-1 text-[10px] leading-snug text-muted-foreground/80">

                  {weekly.benchmark}/week shown for motivation only

                </p>

              </div>

            </div>



            <div className="space-y-1.5">

              <div className="flex justify-between gap-1">

                {weekDays.map((day) => (

                  <div

                    key={day.dateKey}

                    className="flex min-w-0 flex-1 flex-col items-center gap-1.5"

                  >

                    <div

                      className={cn(

                        "h-2 w-full max-w-[2.25rem] rounded-full",

                        day.visited ? "bg-primary" : "bg-muted/50",

                        day.isToday && !day.visited && "ring-1 ring-foreground/25",

                        day.isToday && day.visited && "ring-1 ring-primary/40",

                      )}

                    />

                  </div>

                ))}

              </div>

              <div className="flex justify-between gap-1 px-0.5">

                {weekDays.map((day) => (

                  <span

                    key={`${day.dateKey}-label`}

                    className="flex-1 text-center text-[10px] font-medium text-muted-foreground"

                  >

                    {day.label}

                  </span>

                ))}

              </div>

            </div>

          </CardContent>

        </Card>

      </button>



      <Dialog open={open} onOpenChange={setOpen}>

        <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-2xl sm:max-w-md">

          <DialogHeader>

            <DialogTitle>{monthLabel || "Attendance"}</DialogTitle>

          </DialogHeader>



          {pending && visitCount == null ? (

            <div className="space-y-3" aria-busy="true">

              <div className="flex gap-6">

                <div className="h-10 w-12 animate-pulse rounded-md bg-muted/60" />

                <div className="h-10 w-12 animate-pulse rounded-md bg-muted/60" />

              </div>

              <div className="grid grid-cols-7 gap-1.5">

                {Array.from({ length: 28 }).map((_, i) => (

                  <div

                    key={i}

                    className="aspect-square animate-pulse rounded-full bg-muted/40"

                  />

                ))}

              </div>

            </div>

          ) : (

            <>

              <div className="flex gap-6 text-sm">

                <div>

                  <p className="text-2xl font-bold tabular-nums">

                    {visitCount ?? 0}

                  </p>

                  <p className="text-muted-foreground">visits</p>

                </div>

                <div>

                  <p className="text-2xl font-bold tabular-nums">

                    {avgPerWeek ?? 0}

                  </p>

                  <p className="text-muted-foreground">per week</p>

                </div>

              </div>



              <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground">

                {["M", "T", "W", "T", "F", "S", "S"].map((label) => (

                  <span key={label}>{label}</span>

                ))}

              </div>

              <div className="grid grid-cols-7 gap-1.5">

                {cells.map((cell, index) =>

                  cell.day == null ? (

                    <div key={`empty-${index}`} />

                  ) : (

                    <div

                      key={cell.dateKey!}

                      className={cn(

                        "flex aspect-square items-center justify-center rounded-full text-xs font-medium",

                        cell.visited

                          ? "bg-primary text-primary-foreground"

                          : "bg-muted/40 text-muted-foreground",

                        cell.isToday && "ring-2 ring-foreground",

                      )}

                    >

                      {cell.day}

                    </div>

                  ),

                )}

              </div>

              <p className="text-[11px] text-muted-foreground">

                Highlighted days are recorded visits. Other days aren&apos;t

                marked as missed.

              </p>

            </>

          )}

        </DialogContent>

      </Dialog>

    </>

  );

}


