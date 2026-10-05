import {
  plainTextToHtml,
  substituteNotificationTemplate,
} from "@/lib/notification-settings/template-variables";
import type { NotificationChannelSettings } from "@/lib/notification-settings/types";

const INACTIVE_EXTRA_VARIABLES = ["days_inactive"] as const;

export function buildInactiveMemberEmailFromSettings(
  template: NotificationChannelSettings,
  params: {
    memberName: string;
    gymName: string;
    daysInactive: number;
  },
): { subject: string; html: string; text: string } {
  const vars = {
    member_name: params.memberName,
    gym_name: params.gymName,
    days_inactive: String(params.daysInactive),
  };

  const subject = substituteNotificationTemplate(template.subject, vars, {
    extraAllowedVariables: INACTIVE_EXTRA_VARIABLES,
  });
  const text = substituteNotificationTemplate(template.body, vars, {
    extraAllowedVariables: INACTIVE_EXTRA_VARIABLES,
  });
  const html = `
  <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; color: #111827;">
    ${plainTextToHtml(text)}
  </div>`;

  return { subject, html, text };
}
