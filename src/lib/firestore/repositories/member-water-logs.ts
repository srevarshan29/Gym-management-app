import {
  AggregateField,
  type Firestore,
  type WithFieldValue,
} from "firebase-admin/firestore";

import { COLLECTIONS } from "@/lib/firestore/collections";
import {
  assertMemberSelfAccess,
  assertTenantAccess,
  type FirestoreContext,
} from "@/lib/firestore/context";
import type { DocWithId } from "@/lib/firestore/repositories/base";
import { TenantRepository } from "@/lib/firestore/repositories/base";
import { omitUndefined, serverTimestamps } from "@/lib/firestore/serialize";
import type { MemberWaterLogDoc } from "@/lib/firestore/types";

const LOG_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const OPERATION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function assertValidWaterOperationId(operationId: string): string {
  const trimmed = operationId.trim();
  if (!OPERATION_ID_PATTERN.test(trimmed)) {
    throw new Error("Invalid water operation id.");
  }
  return trimmed;
}

function assertStoredWaterEntryMatches(
  data: MemberWaterLogDoc,
  gymId: string,
  memberId: string,
  logDate: string,
  amountMl: number,
): void {
  if (data.gymId !== gymId || data.memberId !== memberId) {
    throw new Error("Water operation does not belong to this member.");
  }
  if (data.logDate !== logDate || data.amountMl !== amountMl) {
    throw new Error("Water operation payload mismatch.");
  }
}

function isFirestoreAlreadyExistsError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: number }).code === 6
  );
}

export function assertValidWaterLogDate(logDate: string): string {
  const trimmed = logDate.trim();
  if (!LOG_DATE_PATTERN.test(trimmed)) {
    throw new Error("Invalid date.");
  }
  return trimmed;
}

export function assertValidWaterAmountMl(amountMl: number): number {
  if (!Number.isFinite(amountMl) || amountMl <= 0 || amountMl > 5_000) {
    throw new Error("Invalid water amount.");
  }
  return Math.round(amountMl);
}

export class MemberWaterLogsRepository extends TenantRepository<MemberWaterLogDoc> {
  constructor(db: Firestore) {
    super(db, COLLECTIONS.memberWaterLogs);
  }

  async listForMemberOnDate(
    ctx: FirestoreContext,
    gymId: string,
    memberId: string,
    logDate: string,
  ): Promise<DocWithId<MemberWaterLogDoc>[]> {
    assertTenantAccess(ctx, gymId);
    assertMemberSelfAccess(ctx, memberId);
    const date = assertValidWaterLogDate(logDate);

    const snap = await this.collection()
      .where("gymId", "==", gymId)
      .where("memberId", "==", memberId)
      .where("logDate", "==", date)
      .get();

    return snap.docs
      .map((d) => this.fromSnapshot(d.id, d.data()))
      .filter((d): d is DocWithId<MemberWaterLogDoc> => d !== null)
      .sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis());
  }

  private async sumMlForMemberOnDate(
    gymId: string,
    memberId: string,
    logDate: string,
  ): Promise<number> {
    const snap = await this.collection()
      .where("gymId", "==", gymId)
      .where("memberId", "==", memberId)
      .where("logDate", "==", logDate)
      .aggregate({ totalMl: AggregateField.sum("amountMl") })
      .get();
    return snap.data().totalMl ?? 0;
  }

  /**
   * Idempotent quick-add: `operationId` is the document id so retries after a
   * successful write do not create duplicate log rows.
   */
  async addEntry(
    ctx: FirestoreContext,
    gymId: string,
    memberId: string,
    logDate: string,
    amountMl: number,
    operationId: string,
  ): Promise<{ totalMl: number }> {
    assertTenantAccess(ctx, gymId);
    assertMemberSelfAccess(ctx, memberId);
    const date = assertValidWaterLogDate(logDate);
    const ml = assertValidWaterAmountMl(amountMl);
    const opId = assertValidWaterOperationId(operationId);

    const ref = this.docRef(opId);
    const existing = await ref.get();
    if (existing.exists) {
      const data = existing.data() as MemberWaterLogDoc;
      assertStoredWaterEntryMatches(data, gymId, memberId, date, ml);
      return {
        totalMl: await this.sumMlForMemberOnDate(gymId, memberId, date),
      };
    }

    const payload: WithFieldValue<MemberWaterLogDoc> = omitUndefined({
      gymId,
      memberId,
      logDate: date,
      amountMl: ml,
      ...serverTimestamps(),
    });

    try {
      await ref.create(payload);
    } catch (error) {
      if (!isFirestoreAlreadyExistsError(error)) {
        throw error;
      }
      const raced = await ref.get();
      if (!raced.exists) {
        throw error;
      }
      const data = raced.data() as MemberWaterLogDoc;
      assertStoredWaterEntryMatches(data, gymId, memberId, date, ml);
    }

    return {
      totalMl: await this.sumMlForMemberOnDate(gymId, memberId, date),
    };
  }
}
