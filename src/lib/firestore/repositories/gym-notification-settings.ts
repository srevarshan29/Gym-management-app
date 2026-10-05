import { Timestamp, type Firestore } from "firebase-admin/firestore";

import { COLLECTIONS } from "@/lib/firestore/collections";
import type { FirestoreContext } from "@/lib/firestore/context";
import { assertTenantAccess } from "@/lib/firestore/context";
import { DocumentNotFoundError } from "@/lib/firestore/errors";
import type { DocWithId } from "@/lib/firestore/repositories/base";
import { omitUndefined } from "@/lib/firestore/serialize";
import type { GymNotificationSettingsDoc } from "@/lib/firestore/types";
import type { GymNotificationSettingsData } from "@/lib/notification-settings/types";

export type UpsertGymNotificationSettingsInput = Omit<
  GymNotificationSettingsData,
  "gymId"
>;

export class GymNotificationSettingsRepository {
  constructor(private readonly db: Firestore) {}

  private docRef(gymId: string) {
    return this.db.collection(COLLECTIONS.gymNotificationSettings).doc(gymId);
  }

  async getByGymId(
    ctx: FirestoreContext,
    gymId: string,
  ): Promise<GymNotificationSettingsDoc | null> {
    assertTenantAccess(ctx, gymId);
    const snap = await this.docRef(gymId).get();
    if (!snap.exists) return null;
    const data = snap.data() as GymNotificationSettingsDoc;
    if (data.gymId !== gymId) return null;
    return data;
  }

  async upsert(
    ctx: FirestoreContext,
    gymId: string,
    input: UpsertGymNotificationSettingsInput,
  ): Promise<DocWithId<GymNotificationSettingsDoc>> {
    assertTenantAccess(ctx, gymId);
    const now = Timestamp.now();
    const payload: GymNotificationSettingsDoc = {
      gymId,
      automaticEmailNotificationsEnabled:
        input.automaticEmailNotificationsEnabled,
      paymentReceiptEmail: input.paymentReceiptEmail,
      membershipExpiry7Day: input.membershipExpiry7Day,
      membershipExpiry3Day: input.membershipExpiry3Day,
      membershipExpiryDay: input.membershipExpiryDay,
      membershipExpiry2DaysAfter: input.membershipExpiry2DaysAfter,
      membershipExpiry7DaysAfter: input.membershipExpiry7DaysAfter,
      membershipExpiry14DaysAfter: input.membershipExpiry14DaysAfter,
      membershipExpiry30DaysAfter: input.membershipExpiry30DaysAfter,
      manualRenewalReminder: input.manualRenewalReminder,
      inactiveMemberEmail: input.inactiveMemberEmail,
      inactiveAfterDays: input.inactiveAfterDays,
      updatedAt: now,
    };

    await this.docRef(gymId).set(
      omitUndefined({
        ...payload,
        updatedAt: now,
      }),
      { merge: true },
    );

    const saved = await this.getByGymId(ctx, gymId);
    if (!saved) {
      throw new DocumentNotFoundError(COLLECTIONS.gymNotificationSettings, gymId);
    }
    return { id: gymId, ...saved };
  }
}
