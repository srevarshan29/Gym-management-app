import { Timestamp, type Firestore } from "firebase-admin/firestore";

import { buildAttendanceDayDocId } from "@/lib/attendance/delivery-id";
import { attendanceDateKey } from "@/lib/attendance/date-key";
import { maxLastAttendanceAt, shouldUpdateLastAttendanceAt } from "@/lib/attendance/last-attendance";
import type {
  AttendanceCheckInResult,
  AttendanceListItem,
} from "@/lib/attendance/types";
import { COLLECTIONS } from "@/lib/firestore/collections";
import type { FirestoreContext } from "@/lib/firestore/context";
import { assertTenantAccess } from "@/lib/firestore/context";
import type { DocWithId } from "@/lib/firestore/repositories/base";
import { clampPageSize } from "@/lib/firestore/repositories/base";
import type { AttendanceDoc, AttendanceMethod, MemberDoc } from "@/lib/firestore/types";

export const ATTENDANCE_TODAY_PAGE_SIZE = 50;
export const ATTENDANCE_MEMBER_HISTORY_LIMIT = 30;

export class AttendanceRepository {
  constructor(private readonly db: Firestore) {}

  private col() {
    return this.db.collection(COLLECTIONS.attendance);
  }

  private toListItem(row: DocWithId<AttendanceDoc>): AttendanceListItem {
    return {
      id: row.id,
      memberId: row.memberId,
      memberNumber: row.memberNumber,
      memberName: row.memberName,
      checkedInAt: row.checkedInAt.toDate(),
      method: row.method,
      dateKey: row.dateKey,
    };
  }

  /**
   * Firestore indexes (collection `attendance`):
   * - gymId + dateKey + checkedInAt desc (today list)
   * - gymId + memberId + checkedInAt desc (member history)
   */
  async listForDateKey(
    ctx: FirestoreContext,
    gymId: string,
    dateKey: string,
    limit = ATTENDANCE_TODAY_PAGE_SIZE,
  ): Promise<DocWithId<AttendanceDoc>[]> {
    assertTenantAccess(ctx, gymId);
    const pageSize = clampPageSize(limit ?? ATTENDANCE_TODAY_PAGE_SIZE);
    const snap = await this.col()
      .where("gymId", "==", gymId)
      .where("dateKey", "==", dateKey)
      .orderBy("checkedInAt", "desc")
      .limit(pageSize)
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as AttendanceDoc) }));
  }

  async listRecentForMember(
    ctx: FirestoreContext,
    gymId: string,
    memberId: string,
    limit = ATTENDANCE_MEMBER_HISTORY_LIMIT,
  ): Promise<DocWithId<AttendanceDoc>[]> {
    assertTenantAccess(ctx, gymId);
    const pageSize = clampPageSize(limit ?? ATTENDANCE_MEMBER_HISTORY_LIMIT);
    const snap = await this.col()
      .where("gymId", "==", gymId)
      .where("memberId", "==", memberId)
      .orderBy("checkedInAt", "desc")
      .limit(pageSize)
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as AttendanceDoc) }));
  }

  async recordManualCheckIn(
    ctx: FirestoreContext,
    gymId: string,
    member: Pick<
      DocWithId<MemberDoc>,
      "id" | "gymId" | "memberNumber" | "name" | "lastAttendanceAt"
    >,
    checkedInAt: Date,
    dateKey: string = attendanceDateKey(checkedInAt),
  ): Promise<AttendanceCheckInResult> {
    assertTenantAccess(ctx, gymId);
    if (member.gymId !== gymId) {
      throw new Error("Member does not belong to this gym.");
    }

    const docId = buildAttendanceDayDocId(gymId, member.id, dateKey);
    const attendanceRef = this.col().doc(docId);
    const memberRef = this.db.collection(COLLECTIONS.members).doc(member.id);

    return this.db.runTransaction(async (tx) => {
      const existing = await tx.get(attendanceRef);
      if (existing.exists) {
        const data = existing.data() as AttendanceDoc;
        return {
          status: "already_checked_in" as const,
          memberId: member.id,
          memberNumber: member.memberNumber,
          memberName: member.name,
          checkedInAt: data.checkedInAt.toDate(),
        };
      }

      const memberSnap = await tx.get(memberRef);
      if (!memberSnap.exists) {
        throw new Error("Member not found.");
      }
      const memberData = memberSnap.data() as MemberDoc;
      if (memberData.gymId !== gymId) {
        throw new Error("Member does not belong to this gym.");
      }

      const checkedTs = Timestamp.fromDate(checkedInAt);
      const doc: AttendanceDoc = {
        gymId,
        memberId: member.id,
        memberNumber: member.memberNumber,
        memberName: member.name,
        checkedInAt: checkedTs,
        dateKey,
        method: "manual",
      };
      tx.set(attendanceRef, doc);

      const existingLast = memberData.lastAttendanceAt?.toDate() ?? null;
      if (shouldUpdateLastAttendanceAt(existingLast, checkedInAt)) {
        const nextLast = maxLastAttendanceAt(existingLast, checkedInAt);
        tx.update(memberRef, {
          lastAttendanceAt: Timestamp.fromDate(nextLast),
          updatedAt: Timestamp.now(),
        });
      }

      return {
        status: "success" as const,
        memberId: member.id,
        memberNumber: member.memberNumber,
        memberName: member.name,
        checkedInAt,
      };
    });
  }

  mapListItems(rows: DocWithId<AttendanceDoc>[]): AttendanceListItem[] {
    return rows.map((row) => this.toListItem(row));
  }

  /** Validates attendance method values without persisting (model extensibility). */
  static supportedMethods(): AttendanceMethod[] {
    return ["manual", "biometric", "qr"];
  }
}
