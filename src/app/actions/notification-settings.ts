"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { getRepositories, type StaffContext } from "@/lib/firestore";
import { canManageNotificationSettings } from "@/lib/permissions";
import type { GymNotificationSettingsData } from "@/lib/notification-settings/types";
import { requireGym } from "@/lib/session";

const channelSchema = z.object({
  enabled: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .transform((v) => v === true || v === "true"),
  subject: z.string().max(200),
  body: z.string().max(20000),
});

const MEMBERSHIP_EXPIRY_CHANNEL_KEYS = [
  "membershipExpiry7Day",
  "membershipExpiry3Day",
  "membershipExpiryDay",
  "membershipExpiry2DaysAfter",
  "membershipExpiry7DaysAfter",
  "membershipExpiry14DaysAfter",
  "membershipExpiry30DaysAfter",
] as const satisfies ReadonlyArray<keyof GymNotificationSettingsData>;

const settingsSchema = z.object({
  paymentReceiptEmail: channelSchema,
  membershipExpiry7Day: channelSchema,
  membershipExpiry3Day: channelSchema,
  membershipExpiryDay: channelSchema,
  membershipExpiry2DaysAfter: channelSchema,
  membershipExpiry7DaysAfter: channelSchema,
  membershipExpiry14DaysAfter: channelSchema,
  membershipExpiry30DaysAfter: channelSchema,
  manualRenewalReminder: channelSchema,
});

function toStaffContext(user: {
  id: string;
  gymId: string;
  role: StaffContext["role"];
}): StaffContext {
  return {
    kind: "staff",
    userId: user.id,
    gymId: user.gymId,
    role: user.role,
  };
}

function parseChannelFromForm(
  formData: FormData,
  prefix: string,
): z.infer<typeof channelSchema> {
  const enabledRaw = formData.get(`${prefix}.enabled`);
  return {
    enabled: enabledRaw === "true" || enabledRaw === "on",
    subject: String(formData.get(`${prefix}.subject`) ?? ""),
    body: String(formData.get(`${prefix}.body`) ?? ""),
  };
}

export async function updateGymNotificationSettings(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireGym();
  if (!canManageNotificationSettings(user.role)) {
    return actionError("Only the gym owner can change notification settings.");
  }

  const payload = {
    paymentReceiptEmail: parseChannelFromForm(formData, "paymentReceiptEmail"),
    manualRenewalReminder: parseChannelFromForm(
      formData,
      "manualRenewalReminder",
    ),
    ...Object.fromEntries(
      MEMBERSHIP_EXPIRY_CHANNEL_KEYS.map((key) => [
        key,
        parseChannelFromForm(formData, key),
      ]),
    ),
  } as z.infer<typeof settingsSchema>;

  const parsed = settingsSchema.safeParse(payload);
  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? "Invalid input.");
  }

  const { gymNotificationSettings } = getRepositories();
  await gymNotificationSettings.upsert(
    toStaffContext(user),
    user.gymId,
    parsed.data,
  );

  revalidatePath("/settings");
  return actionOk("Notification settings saved.");
}

export type GymNotificationSettingsFormDefaults = Omit<
  GymNotificationSettingsData,
  "gymId"
>;
