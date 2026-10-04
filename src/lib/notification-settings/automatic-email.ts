import type { GymNotificationSettingsData } from "@/lib/notification-settings/types";

/** When false, automatic jobs must not send email (per-channel toggles unchanged). */
export function areAutomaticEmailNotificationsEnabled(
  settings: Pick<GymNotificationSettingsData, "automaticEmailNotificationsEnabled">,
): boolean {
  return settings.automaticEmailNotificationsEnabled !== false;
}
