"use server";

import { z } from "zod";

import { checkInMemberByNumber } from "@/lib/attendance/check-in";
import type { AttendanceCheckInResult } from "@/lib/attendance/types";
import { getMemberAttendanceHistory } from "@/lib/attendance/queries";
import type { AttendanceListItem } from "@/lib/attendance/types";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { getRepositories } from "@/lib/firestore";
import { staffContextFromUser } from "@/lib/firestore/session-context";
import { canManageMembers } from "@/lib/permissions";
import { requireGym } from "@/lib/session";
import {
  formatMemberNumberForMessage,
  parseMemberNumberInput,
} from "@/lib/attendance/member-number-input";

const checkInSchema = z.object({
  memberNumber: z.string().trim().min(1, "Enter a member number."),
});

const historySchema = z.object({
  memberNumber: z.string().trim().min(1, "Enter a member number."),
});

export type CheckInActionData = AttendanceCheckInResult;

export async function checkInByMemberNumberAction(
  _prev: ActionResult<CheckInActionData> | undefined,
  formData: FormData,
): Promise<ActionResult<CheckInActionData>> {
  const user = await requireGym();
  if (!canManageMembers(user.role)) {
    return actionError("You do not have permission to mark attendance.");
  }

  const parsed = checkInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? "Invalid input.");
  }

  if (parseMemberNumberInput(parsed.data.memberNumber) === null) {
    return actionError("Enter a valid member number.");
  }

  const ctx = staffContextFromUser(user);
  const { members, attendance } = getRepositories();
  const result = await checkInMemberByNumber(
    { members, attendance },
    ctx,
    user.gymId,
    parsed.data.memberNumber,
  );

  return actionOk(undefined, result);
}

export type MemberAttendanceHistoryData = {
  history: AttendanceListItem[];
  memberId: string;
  memberName: string;
  memberNumber: number;
};

export async function loadMemberAttendanceHistoryAction(
  _prev: ActionResult<MemberAttendanceHistoryData> | undefined,
  formData: FormData,
): Promise<ActionResult<MemberAttendanceHistoryData>> {
  const user = await requireGym();
  if (!canManageMembers(user.role)) {
    return actionError("You do not have permission to view attendance.");
  }

  const parsed = historySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? "Invalid input.");
  }

  const memberNumber = parseMemberNumberInput(parsed.data.memberNumber);
  if (memberNumber === null) {
    return actionError("Enter a valid member number.");
  }

  const ctx = staffContextFromUser(user);
  const { members } = getRepositories();
  const member = await members.findByMemberNumber(ctx, user.gymId, memberNumber);
  if (!member) {
    return actionError(
      `Member ${formatMemberNumberForMessage(memberNumber)} not found.`,
    );
  }

  const history = await getMemberAttendanceHistory(user.gymId, member.id);
  return actionOk(undefined, {
    history,
    memberId: member.id,
    memberName: member.name,
    memberNumber: member.memberNumber,
  });
}
