import type { FirestoreContext } from "@/lib/firestore/context";
import type { MembersRepository } from "@/lib/firestore/repositories/members";
import type { AttendanceRepository } from "@/lib/firestore/repositories/attendance";
import {
  formatMemberNumberForMessage,
  parseMemberNumberInput,
} from "@/lib/attendance/member-number-input";
import { isMembershipActiveForAttendance } from "@/lib/attendance/membership-active";
import type { AttendanceCheckInResult } from "@/lib/attendance/types";

export async function checkInMemberByNumber(
  deps: {
    members: MembersRepository;
    attendance: AttendanceRepository;
  },
  ctx: FirestoreContext,
  gymId: string,
  rawInput: string,
  now: Date = new Date(),
): Promise<AttendanceCheckInResult> {
  const memberNumber = parseMemberNumberInput(rawInput);
  if (memberNumber === null) {
    return {
      status: "not_found",
      memberNumber: 0,
      memberNumberLabel: formatMemberNumberForMessage(0).replace("0000", "????"),
    };
  }

  const member = await deps.members.findByMemberNumber(ctx, gymId, memberNumber);
  if (!member) {
    return {
      status: "not_found",
      memberNumber,
      memberNumberLabel: formatMemberNumberForMessage(memberNumber),
    };
  }

  const endDate = member.currentEndDate?.toDate() ?? null;
  if (!isMembershipActiveForAttendance(endDate, now)) {
    return {
      status: "membership_expired",
      memberId: member.id,
      memberNumber: member.memberNumber,
      memberName: member.name,
    };
  }

  return deps.attendance.recordManualCheckIn(ctx, gymId, member, now);
}
