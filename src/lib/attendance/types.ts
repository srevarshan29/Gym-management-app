import type { MemberGender } from "@/lib/firestore/types";

export type AttendanceCheckInResult =
  | {
      status: "success";
      memberId: string;
      memberNumber: number;
      memberName: string;
      checkedInAt: Date;
      photoUrl: string | null;
      gender: MemberGender;
    }
  | {
      status: "not_found";
      memberNumber: number;
      memberNumberLabel: string;
    }
  | {
      status: "membership_expired";
      memberId: string;
      memberNumber: number;
      memberName: string;
    };

export type AttendanceListItem = {
  id: string;
  memberId: string;
  memberNumber: number;
  memberName: string;
  checkedInAt: Date;
  method: string;
  dateKey: string;
};
