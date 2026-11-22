import { Timestamp, type Firestore } from "firebase-admin/firestore";

import { COLLECTIONS } from "@/lib/firestore/collections";
import { newDocId } from "@/lib/firestore";
import { serverTimestamps } from "@/lib/firestore/serialize";

export type GymLifecycleAuditEventType =
  | "deactivated"
  | "reactivated"
  | "deletion_scheduled"
  | "deletion_immediate_requested"
  | "deletion_cancelled"
  | "backup_started"
  | "backup_succeeded"
  | "backup_failed"
  | "data_export_started"
  | "data_export_succeeded"
  | "data_export_failed"
  | "purge_confirmed"
  | "purge_started"
  | "purge_phase_advanced"
  | "purge_completed"
  | "purge_failed"
  | "purge_resumed"
  | "registration_token_rotated";

export type GymLifecycleAuditDoc = {
  gymId: string;
  event: GymLifecycleAuditEventType;
  actorUserId: string;
  details?: Record<string, unknown> | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export class GymLifecycleAuditRepository {
  constructor(private readonly db: Firestore) {}

  private col() {
    return this.db.collection(COLLECTIONS.gymLifecycleAudit);
  }

  async append(input: {
    gymId: string;
    event: GymLifecycleAuditEventType;
    actorUserId: string;
    details?: Record<string, unknown> | null;
  }) {
    const id = newDocId();
    const now = Timestamp.now();
    await this.col()
      .doc(id)
      .set({
        gymId: input.gymId,
        event: input.event,
        actorUserId: input.actorUserId,
        details: input.details ?? null,
        ...serverTimestamps(now),
      });
    return id;
  }

  async listByGym(gymId: string, limit = 50) {
    const snap = await this.col()
      .where("gymId", "==", gymId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as GymLifecycleAuditDoc) }));
  }
}