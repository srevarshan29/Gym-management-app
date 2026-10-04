import { requireGym } from "@/lib/session";
import { staffContextFromUser } from "@/lib/firestore/session-context";
import { getRepositories } from "@/lib/firestore";
import { attendanceDateKey } from "@/lib/attendance/date-key";
import type { AttendanceListItem } from "@/lib/attendance/types";
import {
  ATTENDANCE_TODAY_PAGE_SIZE,
  ATTENDANCE_MEMBER_HISTORY_LIMIT,
} from "@/lib/firestore/repositories/attendance";

export async function getTodayAttendanceList(
  gymId: string,
): Promise<AttendanceListItem[]> {
  const user = await requireGym();
  if (user.gymId !== gymId) return [];

  const ctx = staffContextFromUser(user);
  const { attendance } = getRepositories();
  const dateKey = attendanceDateKey();
  const rows = await attendance.listForDateKey(
    ctx,
    gymId,
    dateKey,
    ATTENDANCE_TODAY_PAGE_SIZE,
  );

  return attendance.mapListItems(rows);
}

export async function getMemberAttendanceHistory(
  gymId: string,
  memberId: string,
): Promise<AttendanceListItem[]> {
  const user = await requireGym();
  if (user.gymId !== gymId) return [];

  const ctx = staffContextFromUser(user);
  const { attendance, members } = getRepositories();
  const member = await members.findByIdAndGym(ctx, memberId, gymId);
  if (!member) return [];

  const rows = await attendance.listRecentForMember(
    ctx,
    gymId,
    memberId,
    ATTENDANCE_MEMBER_HISTORY_LIMIT,
  );
  return attendance.mapListItems(rows);
}
