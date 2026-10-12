import { randomUUID } from "node:crypto";

import type { Firestore, WithFieldValue } from "firebase-admin/firestore";

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

  async addEntry(
    ctx: FirestoreContext,
    gymId: string,
    memberId: string,
    logDate: string,
    amountMl: number,
  ): Promise<{ totalMl: number }> {
    assertTenantAccess(ctx, gymId);
    assertMemberSelfAccess(ctx, memberId);
    const date = assertValidWaterLogDate(logDate);
    const ml = assertValidWaterAmountMl(amountMl);

    const id = randomUUID();
    const payload: WithFieldValue<MemberWaterLogDoc> = omitUndefined({
      gymId,
      memberId,
      logDate: date,
      amountMl: ml,
      ...serverTimestamps(),
    });

    await this.docRef(id).set(payload);

    const rows = await this.listForMemberOnDate(ctx, gymId, memberId, date);
    const totalMl = rows.reduce((sum, row) => sum + row.amountMl, 0);
    return { totalMl };
  }
}
