"use server";

import { z } from "zod";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import type { MemberContext } from "@/lib/firestore/context";
import {
  assertValidWaterAmountMl,
  assertValidWaterLogDate,
  assertValidWaterOperationId,
} from "@/lib/firestore/repositories/member-water-logs";
import { getRepositories } from "@/lib/firestore";
import {
  loadMemberAttendanceMonthSummary,
  type MemberAttendanceMonthSummary,
} from "@/lib/member-portal/load-member-portal-dashboard";
import { requireMember } from "@/lib/member-session";
import {
  parseMemberDailyWaterTargetMl,
  parseMemberWeeklyAttendanceTarget,
  resolveMemberDailyWaterTargetMl,
} from "@/lib/member-portal/member-dashboard-goals";
import {
  MEMBER_WATER_QUICK_ADD_ML,
  waterDayProgress,
} from "@/lib/water/water-progress";

function memberContextFromSession(member: {
  gymId: string;
  memberId: string;
}): MemberContext {
  return { kind: "member", gymId: member.gymId, memberId: member.memberId };
}

const addWaterSchema = z.object({
  logDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  amountMl: z.coerce.number().int().min(1).max(5000).optional(),
  operationId: z.string().uuid(),
});

export type AddMemberWaterResult = {
  consumedMl: number;
  targetMl: number;
  percent: number;
  goalComplete: boolean;
};

const celebrateWaterSchema = z.object({
  logDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/** Persists water-goal celebration state without revalidating the dashboard route. */
export async function celebrateMemberWaterGoalAction(
  input: z.infer<typeof celebrateWaterSchema>,
): Promise<ActionResult<void>> {
  try {
    const member = await requireMember();
    const logDate = assertValidWaterLogDate(celebrateWaterSchema.parse(input).logDate);
    const ctx = memberContextFromSession(member);
    const { memberPortalDashboardState } = getRepositories();
    await memberPortalDashboardState.mergeForMember(ctx, member.gymId, member.memberId, {
      celebratedWaterDateKey: logDate,
    });
    return actionOk(undefined, undefined);
  } catch (error) {
    console.error("celebrateMemberWaterGoalAction", error);
    return actionError(
      error instanceof Error ? error.message : "Could not save celebration.",
    );
  }
}

export async function addMemberWaterAction(
  input: z.infer<typeof addWaterSchema>,
): Promise<ActionResult<AddMemberWaterResult>> {
  try {
    const member = await requireMember();
    const parsed = addWaterSchema.parse(input);
    const logDate = assertValidWaterLogDate(parsed.logDate);
    const amountMl = assertValidWaterAmountMl(
      parsed.amountMl ?? MEMBER_WATER_QUICK_ADD_ML,
    );
    const operationId = assertValidWaterOperationId(parsed.operationId);

    const ctx = memberContextFromSession(member);
    const { memberWaterLogs, memberPortalDashboardState } = getRepositories();
    const dashboardState = await memberPortalDashboardState.getForMember(
      ctx,
      member.gymId,
      member.memberId,
    );
    const targetMl = resolveMemberDailyWaterTargetMl(dashboardState);
    const { totalMl } = await memberWaterLogs.addEntry(
      ctx,
      member.gymId,
      member.memberId,
      logDate,
      amountMl,
      operationId,
    );

    const progress = waterDayProgress(totalMl, targetMl);
    return actionOk(undefined, {
      consumedMl: progress.consumedMl,
      targetMl: progress.targetMl,
      percent: Math.round(progress.percent),
      goalComplete: progress.goalComplete,
    });
  } catch (error) {
    console.error("addMemberWaterAction", error);
    return actionError(
      error instanceof Error ? error.message : "Could not log water.",
    );
  }
}

const monthSchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  monthIndex0: z.coerce.number().int().min(0).max(11),
});

const waterGoalSchema = z.object({
  targetMl: z.coerce.number().int(),
});

export async function updateMemberDailyWaterGoalAction(
  input: z.infer<typeof waterGoalSchema>,
): Promise<ActionResult<{ targetMl: number }>> {
  try {
    const member = await requireMember();
    const targetMl = parseMemberDailyWaterTargetMl(
      waterGoalSchema.parse(input).targetMl,
    );
    const ctx = memberContextFromSession(member);
    const { memberPortalDashboardState } = getRepositories();
    await memberPortalDashboardState.mergeForMember(
      ctx,
      member.gymId,
      member.memberId,
      { dailyWaterTargetMl: targetMl },
    );
    return actionOk("Daily water goal saved.", { targetMl });
  } catch (error) {
    console.error("updateMemberDailyWaterGoalAction", error);
    return actionError(
      error instanceof Error ? error.message : "Could not save water goal.",
    );
  }
}

const weeklyGoalSchema = z.object({
  targetDays: z.coerce.number().int(),
});

export async function updateMemberWeeklyAttendanceGoalAction(
  input: z.infer<typeof weeklyGoalSchema>,
): Promise<ActionResult<{ targetDays: number }>> {
  try {
    const member = await requireMember();
    const targetDays = parseMemberWeeklyAttendanceTarget(
      weeklyGoalSchema.parse(input).targetDays,
    );
    const ctx = memberContextFromSession(member);
    const { memberPortalDashboardState } = getRepositories();
    await memberPortalDashboardState.mergeForMember(
      ctx,
      member.gymId,
      member.memberId,
      { weeklyAttendanceTarget: targetDays },
    );
    return actionOk("Weekly gym goal saved.", { targetDays });
  } catch (error) {
    console.error("updateMemberWeeklyAttendanceGoalAction", error);
    return actionError(
      error instanceof Error
        ? error.message
        : "Could not save weekly goal.",
    );
  }
}

export async function loadMemberAttendanceMonthAction(
  input: z.infer<typeof monthSchema>,
): Promise<ActionResult<MemberAttendanceMonthSummary>> {
  try {
    const member = await requireMember();
    const parsed = monthSchema.parse(input);
    const ctx = memberContextFromSession(member);
    const summary = await loadMemberAttendanceMonthSummary(
      ctx,
      parsed.year,
      parsed.monthIndex0,
    );
    return actionOk(undefined, summary);
  } catch (error) {
    console.error("loadMemberAttendanceMonthAction", error);
    return actionError(
      error instanceof Error ? error.message : "Could not load attendance.",
    );
  }
}
