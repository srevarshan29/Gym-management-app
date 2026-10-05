import { attendanceDateKey, ATTENDANCE_GYM_TIMEZONE } from "@/lib/attendance/date-key";

export type ReportDatePreset = "last_month" | "last_3_months" | "custom";

export type ResolvedReportDateRange = {
  preset: ReportDatePreset;
  /** Inclusive calendar bounds in the gym timezone (YYYY-MM-DD). */
  startDateKey: string;
  endDateKey: string;
  /** Half-open interval [startInstant, endInstant) for Firestore timestamps. */
  startInstant: Date;
  endInstant: Date;
  /** Membership status is evaluated at the end of the selected period. */
  asOfInstant: Date;
};

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateKey(value: string): boolean {
  if (!DATE_KEY_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const probe = new Date(Date.UTC(y, m - 1, d));
  return (
    probe.getUTCFullYear() === y &&
    probe.getUTCMonth() === m - 1 &&
    probe.getUTCDate() === d
  );
}

export function calendarPartsInTimeZone(
  date: Date,
  timeZone: string = ATTENDANCE_GYM_TIMEZONE,
): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");
  return { year: get("year"), month: get("month"), day: get("day") };
}

export function dateKeyFromParts(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addCalendarMonths(
  year: number,
  month: number,
  deltaMonths: number,
): { year: number; month: number } {
  const anchor = new Date(Date.UTC(year, month - 1 + deltaMonths, 1));
  return {
    year: anchor.getUTCFullYear(),
    month: anchor.getUTCMonth() + 1,
  };
}

function lastDayOfCalendarMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function nextDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return dateKeyFromParts(
    next.getUTCFullYear(),
    next.getUTCMonth() + 1,
    next.getUTCDate(),
  );
}

function getTimezoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return asUtc - date.getTime();
}

/** UTC instant for 00:00:00 on `dateKey` in the gym timezone. */
export function gymTimezoneInstantAtStartOfDay(
  dateKey: string,
  timeZone: string = ATTENDANCE_GYM_TIMEZONE,
): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  const utcMidnightGuess = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
  let instant = new Date(utcMidnightGuess);
  for (let i = 0; i < 4; i++) {
    const offsetMs = getTimezoneOffsetMs(instant, timeZone);
    instant = new Date(utcMidnightGuess - offsetMs);
  }
  return instant;
}

function buildResolvedRange(
  preset: ReportDatePreset,
  startDateKey: string,
  endDateKey: string,
  timeZone: string = ATTENDANCE_GYM_TIMEZONE,
): ResolvedReportDateRange {
  const startInstant = gymTimezoneInstantAtStartOfDay(startDateKey, timeZone);
  const endInstant = gymTimezoneInstantAtStartOfDay(
    nextDateKey(endDateKey),
    timeZone,
  );
  return {
    preset,
    startDateKey,
    endDateKey,
    startInstant,
    endInstant,
    asOfInstant: new Date(endInstant.getTime() - 1),
  };
}

export function resolveLastMonthRange(
  now: Date = new Date(),
  timeZone: string = ATTENDANCE_GYM_TIMEZONE,
): ResolvedReportDateRange {
  const { year, month } = calendarPartsInTimeZone(now, timeZone);
  const prev = addCalendarMonths(year, month, -1);
  const startDateKey = dateKeyFromParts(prev.year, prev.month, 1);
  const endDay = lastDayOfCalendarMonth(prev.year, prev.month);
  const endDateKey = dateKeyFromParts(prev.year, prev.month, endDay);
  return buildResolvedRange("last_month", startDateKey, endDateKey, timeZone);
}

export function resolveLast3MonthsRange(
  now: Date = new Date(),
  timeZone: string = ATTENDANCE_GYM_TIMEZONE,
): ResolvedReportDateRange {
  const { year, month } = calendarPartsInTimeZone(now, timeZone);
  const endMonth = addCalendarMonths(year, month, -1);
  const startMonth = addCalendarMonths(endMonth.year, endMonth.month, -2);
  const startDateKey = dateKeyFromParts(startMonth.year, startMonth.month, 1);
  const endDay = lastDayOfCalendarMonth(endMonth.year, endMonth.month);
  const endDateKey = dateKeyFromParts(endMonth.year, endMonth.month, endDay);
  return buildResolvedRange("last_3_months", startDateKey, endDateKey, timeZone);
}

export function validateCustomDateRange(
  startDateKey: string,
  endDateKey: string,
): { ok: true } | { ok: false; error: string } {
  if (!startDateKey?.trim()) {
    return { ok: false, error: "Start date is required." };
  }
  if (!endDateKey?.trim()) {
    return { ok: false, error: "End date is required." };
  }
  if (!isValidDateKey(startDateKey)) {
    return { ok: false, error: "Start date is invalid." };
  }
  if (!isValidDateKey(endDateKey)) {
    return { ok: false, error: "End date is invalid." };
  }
  if (startDateKey > endDateKey) {
    return { ok: false, error: "Start date must be on or before end date." };
  }
  return { ok: true };
}

export function resolveCustomRange(
  startDateKey: string,
  endDateKey: string,
  timeZone: string = ATTENDANCE_GYM_TIMEZONE,
): ResolvedReportDateRange {
  const validation = validateCustomDateRange(startDateKey, endDateKey);
  if (!validation.ok) {
    throw new Error(validation.error);
  }
  return buildResolvedRange("custom", startDateKey, endDateKey, timeZone);
}

export type ReportDateRangeInput = {
  preset?: string | null;
  start?: string | null;
  end?: string | null;
};

export function resolveReportDateRange(
  input: ReportDateRangeInput,
  now: Date = new Date(),
  timeZone: string = ATTENDANCE_GYM_TIMEZONE,
): { ok: true; range: ResolvedReportDateRange } | { ok: false; error: string } {
  const preset = input.preset ?? "last_month";
  if (preset === "last_month") {
    return { ok: true, range: resolveLastMonthRange(now, timeZone) };
  }
  if (preset === "last_3_months") {
    return { ok: true, range: resolveLast3MonthsRange(now, timeZone) };
  }
  if (preset === "custom") {
    const validation = validateCustomDateRange(
      input.start ?? "",
      input.end ?? "",
    );
    if (!validation.ok) return validation;
    return {
      ok: true,
      range: resolveCustomRange(input.start!, input.end!, timeZone),
    };
  }
  return { ok: false, error: "Invalid date range preset." };
}

export function formatReportDateRangeLabel(range: ResolvedReportDateRange): string {
  const start = formatDateKeyLabel(range.startDateKey);
  const end = formatDateKeyLabel(range.endDateKey);
  if (range.startDateKey === range.endDateKey) return start;
  return `${start} – ${end}`;
}

function formatDateKeyLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/** For tests: today’s dateKey in gym timezone. */
export function gymTodayDateKey(now: Date = new Date()): string {
  return attendanceDateKey(now, ATTENDANCE_GYM_TIMEZONE);
}
