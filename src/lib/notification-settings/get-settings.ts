import { getRepositories, platformContext } from "@/lib/firestore";
import { mergeGymNotificationSettings } from "@/lib/notification-settings/merge";
import type { GymNotificationSettingsData } from "@/lib/notification-settings/types";

export async function getGymNotificationSettings(
  tenantGymId: string,
): Promise<GymNotificationSettingsData> {
  const { gymNotificationSettings } = getRepositories();
  const stored = await gymNotificationSettings.getByGymId(
    platformContext,
    tenantGymId,
  );
  return mergeGymNotificationSettings(tenantGymId, stored);
}
