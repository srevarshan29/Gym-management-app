import { formatDate } from "@/lib/utils";

/** Shown when optional date/day values are unavailable (e.g. payment without period end). */
export const NOTIFICATION_MISSING_VALUE = "—";

/** Core personalization tokens supported in owner templates. */
export const NOTIFICATION_TEMPLATE_VARIABLES = [
  "member_name",
  "gym_name",
  "expiry_date",
  "days_remaining",
] as const;

export type NotificationTemplateVariableName =
  (typeof NOTIFICATION_TEMPLATE_VARIABLES)[number];

/** Payment receipt emails may also substitute receipt_number at send time. */
export const PAYMENT_RECEIPT_EXTRA_TEMPLATE_VARIABLES = [
  "receipt_number",
] as const;

export const NOTIFICATION_TEMPLATE_VARIABLE_DESCRIPTIONS: ReadonlyArray<{
  name: NotificationTemplateVariableName;
  token: string;
  meaning: string;
}> = [
  {
    name: "member_name",
    token: "{{member_name}}",
    meaning: "Member's display name",
  },
  {
    name: "gym_name",
    token: "{{gym_name}}",
    meaning: "Your gym name from the gym profile",
  },
  {
    name: "expiry_date",
    token: "{{expiry_date}}",
    meaning:
      "Membership end date (expiry reminders), or subscription end date on payment receipts when available",
  },
  {
    name: "days_remaining",
    token: "{{days_remaining}}",
    meaning:
      "Days until expiry (positive before, 0 on expiry day, negative after expiry)",
  },
];

export type NotificationTemplateVariables = Partial<
  Record<
    NotificationTemplateVariableName | "receipt_number",
    string
  >
>;

const TEMPLATE_TOKEN_PATTERN = /\{\{([a-zA-Z0-9_]+)\}\}/g;

function startOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Calendar-day difference from `fromDate` through `endDate` (inclusive-style ceil). */
export function computeCalendarDaysRemaining(
  endDate: Date,
  fromDate: Date,
): number {
  const endDay = startOfLocalDay(endDate);
  const fromDay = startOfLocalDay(fromDate);
  return Math.ceil(
    (endDay.getTime() - fromDay.getTime()) / (1000 * 60 * 60 * 24),
  );
}

export function buildCoreNotificationTemplateVariables(params: {
  memberName: string;
  gymName: string;
  expiryDate: Date | null | undefined;
  daysRemaining: number | null | undefined;
  missingValue?: string;
}): Record<NotificationTemplateVariableName, string> {
  const missing = params.missingValue ?? NOTIFICATION_MISSING_VALUE;
  return {
    member_name: params.memberName,
    gym_name: params.gymName,
    expiry_date: params.expiryDate
      ? formatDate(params.expiryDate)
      : missing,
    days_remaining:
      params.daysRemaining === null || params.daysRemaining === undefined
        ? missing
        : String(params.daysRemaining),
  };
}

export type SubstituteNotificationTemplateOptions = {
  extraAllowedVariables?: readonly string[];
};

/**
 * Replaces only recognized `{{variable}}` tokens. Unknown tokens are left unchanged.
 * Values are substituted verbatim; escape for HTML separately before rendering email bodies.
 */
export function substituteNotificationTemplate(
  template: string,
  variables: NotificationTemplateVariables,
  options?: SubstituteNotificationTemplateOptions,
): string {
  const allowed = new Set<string>([
    ...NOTIFICATION_TEMPLATE_VARIABLES,
    ...(options?.extraAllowedVariables ?? []),
  ]);

  return template.replace(TEMPLATE_TOKEN_PATTERN, (match, rawName: string) => {
    if (!allowed.has(rawName)) {
      return match;
    }
    if (!Object.prototype.hasOwnProperty.call(variables, rawName)) {
      return match;
    }
    return variables[rawName as keyof NotificationTemplateVariables] ?? "";
  });
}

export function plainTextToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  return escaped
    .split(/\n\n+/)
    .map((block) =>
      `<p style="margin:0 0 12px;line-height:1.5;">${block.replace(/\n/g, "<br/>")}</p>`,
    )
    .join("");
}
