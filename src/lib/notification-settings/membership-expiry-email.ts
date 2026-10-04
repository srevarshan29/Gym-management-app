import { formatDate } from "@/lib/utils";
import {
  plainTextToHtml,
  substituteNotificationTemplate,
} from "@/lib/notification-settings/template-variables";
import type { NotificationChannelSettings } from "@/lib/notification-settings/types";

export function buildMembershipExpiryEmailFromSettings(
  template: NotificationChannelSettings,
  params: {
    memberName: string;
    gymName: string;
    expiryDate: Date;
    daysRemaining: number;
  },
): { subject: string; html: string; text: string } {
  const vars = {
    member_name: params.memberName,
    gym_name: params.gymName,
    expiry_date: formatDate(params.expiryDate),
    days_remaining: String(params.daysRemaining),
  };

  const subject = substituteNotificationTemplate(template.subject, vars);
  const text = substituteNotificationTemplate(template.body, vars);
  const html = `
  <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; color: #111827;">
    ${plainTextToHtml(text)}
  </div>`;

  return { subject, html, text };
}
