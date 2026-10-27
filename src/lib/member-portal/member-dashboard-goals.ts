import type { DocWithId } from "@/lib/firestore/repositories/base";
import type { MemberPortalDashboardStateDoc } from "@/lib/firestore/types";
import { DEFAULT_MEMBER_WATER_TARGET_ML } from "@/lib/water/water-progress";

export const MEMBER_DAILY_WATER_TARGET_MIN_ML = 500;
export const MEMBER_DAILY_WATER_TARGET_MAX_ML = 6000;
/** Slider and persisted goal granularity. */
export const MEMBER_DAILY_WATER_TARGET_SLIDER_STEP_ML = 50;
/** ± control buttons on the water goal editor. */
export const MEMBER_DAILY_WATER_TARGET_BUTTON_STEP_ML = 250;
/** @deprecated Use slider/button step constants explicitly. */
export const MEMBER_DAILY_WATER_TARGET_STEP_ML =
  MEMBER_DAILY_WATER_TARGET_SLIDER_STEP_ML;

export const MEMBER_WEEKLY_ATTENDANCE_TARGET_MIN = 1;
export const MEMBER_WEEKLY_ATTENDANCE_TARGET_MAX = 7;
export const DEFAULT_MEMBER_WEEKLY_ATTENDANCE_TARGET = 5;

export const MEMBER_WATER_ACCENT = "#8EDBFF";

export function parseMemberDailyWaterTargetMl(value: unknown): number {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;
  if (!Number.isFinite(n)) {
    throw new Error(
      `Daily water goal must be between ${MEMBER_DAILY_WATER_TARGET_MIN_ML} and ${MEMBER_DAILY_WATER_TARGET_MAX_ML} ml.`,
    );
  }
  const rounded =
    Math.round(n / MEMBER_DAILY_WATER_TARGET_SLIDER_STEP_ML)
    * MEMBER_DAILY_WATER_TARGET_SLIDER_STEP_ML;
  if (
    rounded < MEMBER_DAILY_WATER_TARGET_MIN_ML ||
    rounded > MEMBER_DAILY_WATER_TARGET_MAX_ML
  ) {
    throw new Error(
      `Daily water goal must be between ${MEMBER_DAILY_WATER_TARGET_MIN_ML} and ${MEMBER_DAILY_WATER_TARGET_MAX_ML} ml.`,
    );
  }
  return rounded;
}

export function parseMemberWeeklyAttendanceTarget(value: unknown): number {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : NaN;
  if (
    !Number.isFinite(n) ||
    n < MEMBER_WEEKLY_ATTENDANCE_TARGET_MIN ||
    n > MEMBER_WEEKLY_ATTENDANCE_TARGET_MAX
  ) {
    throw new Error(
      `Weekly gym goal must be between ${MEMBER_WEEKLY_ATTENDANCE_TARGET_MIN} and ${MEMBER_WEEKLY_ATTENDANCE_TARGET_MAX} days.`,
    );
  }
  return Math.round(n);
}

export function resolveMemberDailyWaterTargetMl(
  state: DocWithId<MemberPortalDashboardStateDoc> | null | undefined,
): number {
  if (state?.dailyWaterTargetMl == null) {
    return DEFAULT_MEMBER_WATER_TARGET_ML;
  }
  try {
    return parseMemberDailyWaterTargetMl(state.dailyWaterTargetMl);
  } catch {
    return DEFAULT_MEMBER_WATER_TARGET_ML;
  }
}

export function resolveMemberWeeklyAttendanceTarget(
  state: DocWithId<MemberPortalDashboardStateDoc> | null | undefined,
): number {
  if (state?.weeklyAttendanceTarget == null) {
    return DEFAULT_MEMBER_WEEKLY_ATTENDANCE_TARGET;
  }
  try {
    return parseMemberWeeklyAttendanceTarget(state.weeklyAttendanceTarget);
  } catch {
    return DEFAULT_MEMBER_WEEKLY_ATTENDANCE_TARGET;
  }
}

export function clampWaterTargetDraftMl(value: number): number {
  const stepped =
    Math.round(value / MEMBER_DAILY_WATER_TARGET_SLIDER_STEP_ML)
    * MEMBER_DAILY_WATER_TARGET_SLIDER_STEP_ML;
  return Math.min(
    MEMBER_DAILY_WATER_TARGET_MAX_ML,
    Math.max(MEMBER_DAILY_WATER_TARGET_MIN_ML, stepped),
  );
}

export function adjustWaterTargetByButtonMl(
  currentMl: number,
  deltaMl: number,
): number {
  return clampWaterTargetDraftMl(
    currentMl + deltaMl,
  );
}
