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

const settingsSchema = z.object({
  paymentReceiptEmail: channelSchema,
  membershipExpiry7Day: channelSchema,
  membershipExpiry3Day: channelSchema,
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
    membershipExpiry7Day: parseChannelFromForm(
      formData,
      "membershipExpiry7Day",
    ),
    membershipExpiry3Day: parseChannelFromForm(
      formData,
      "membershipExpiry3Day",
    ),
  };

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

export type GymNotificationSettingsFormDefaults = Pick<
  GymNotificationSettingsData,
  "paymentReceiptEmail" | "membershipExpiry7Day" | "membershipExpiry3Day"
>;
