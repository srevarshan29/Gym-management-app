"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Bell, RotateCcw } from "lucide-react";

import {
  updateGymNotificationSettings,
  type GymNotificationSettingsFormDefaults,
} from "@/app/actions/notification-settings";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useGuardedFormAction } from "@/hooks/use-guarded-form-action";
import type { ActionResult } from "@/lib/action-result";
import {
  NOTIFICATION_TEMPLATE_VARIABLE_DESCRIPTIONS,
  PAYMENT_RECEIPT_EXTRA_TEMPLATE_VARIABLES,
} from "@/lib/notification-settings/template-variables";
import type {
  GymNotificationSettingsData,
  NotificationChannelSettings,
} from "@/lib/notification-settings/types";

type ChannelKey = Exclude<
  keyof GymNotificationSettingsFormDefaults,
  "automaticEmailNotificationsEnabled"
>;

const CHANNEL_META: Record<
  ChannelKey,
  { title: string; description: string }
> = {
  paymentReceiptEmail: {
    title: "Payment receipt email",
    description:
      "Sent to the member (and owner copy when configured) after a payment is logged. SMS is not affected.",
  },
  manualRenewalReminder: {
    title: "Manual renewal reminder",
    description:
      "Email sent when you use Send reminder on Expired or Upcoming Renewals. Not controlled by the automatic email master switch.",
  },
  membershipExpiry7Day: {
    title: "7 days before",
    description: "Email reminder sent 7 days before the member's end date.",
  },
  membershipExpiry3Day: {
    title: "3 days before",
    description: "Email reminder sent 3 days before the member's end date.",
  },
  membershipExpiryDay: {
    title: "Expiry day",
    description: "Email reminder sent on the day the membership ends.",
  },
  membershipExpiry2DaysAfter: {
    title: "2 days after",
    description: "Follow-up email sent 2 days after the membership end date.",
  },
  membershipExpiry7DaysAfter: {
    title: "7 days after",
    description: "Follow-up email sent 7 days after the membership end date.",
  },
  membershipExpiry14DaysAfter: {
    title: "14 days after",
    description: "Follow-up email sent 14 days after the membership end date.",
  },
  membershipExpiry30DaysAfter: {
    title: "30 days after",
    description: "Follow-up email sent 30 days after the membership end date.",
  },
};

const EXPIRY_CHANNEL_KEYS: ChannelKey[] = [
  "membershipExpiry7Day",
  "membershipExpiry3Day",
  "membershipExpiryDay",
  "membershipExpiry2DaysAfter",
  "membershipExpiry7DaysAfter",
  "membershipExpiry14DaysAfter",
  "membershipExpiry30DaysAfter",
];

type Props = {
  settings: GymNotificationSettingsData;
  defaults: GymNotificationSettingsFormDefaults;
};

export function EmailAutomationSettingsForm({ settings, defaults }: Props) {
  const guardedAction = useGuardedFormAction(updateGymNotificationSettings);
  const [state, formAction] = useFormState<ActionResult | undefined, FormData>(
    guardedAction,
    undefined,
  );

  const [automaticEnabled, setAutomaticEnabled] = React.useState(
    settings.automaticEmailNotificationsEnabled,
  );

  const [channels, setChannels] = React.useState<
    Record<ChannelKey, NotificationChannelSettings>
  >({
    paymentReceiptEmail: settings.paymentReceiptEmail,
    manualRenewalReminder: settings.manualRenewalReminder,
    membershipExpiry7Day: settings.membershipExpiry7Day,
    membershipExpiry3Day: settings.membershipExpiry3Day,
    membershipExpiryDay: settings.membershipExpiryDay,
    membershipExpiry2DaysAfter: settings.membershipExpiry2DaysAfter,
    membershipExpiry7DaysAfter: settings.membershipExpiry7DaysAfter,
    membershipExpiry14DaysAfter: settings.membershipExpiry14DaysAfter,
    membershipExpiry30DaysAfter: settings.membershipExpiry30DaysAfter,
  });

  React.useEffect(() => {
    if (!state) return;
    if (state.ok) toast.success(state.message ?? "Email automation settings saved.");
    else toast.error(state.error);
  }, [state]);

  function setChannelField<K extends keyof NotificationChannelSettings>(
    key: ChannelKey,
    field: K,
    value: NotificationChannelSettings[K],
  ) {
    setChannels((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  }

  function restoreDefault(key: ChannelKey) {
    setChannels((prev) => ({
      ...prev,
      [key]: { ...defaults[key] },
    }));
  }

  const variableHint = [
    ...NOTIFICATION_TEMPLATE_VARIABLE_DESCRIPTIONS,
    {
      name: "receipt_number" as const,
      token: "{{receipt_number}}",
      meaning: "Receipt number (payment receipt email only)",
    },
  ];

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Automatic email notifications</CardTitle>
          <CardDescription>
            When off, automated payment receipt emails and membership expiry reminder
            jobs will not send email. Manual Send reminder on renewals pages still
            works when its own toggle is on.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border p-4">
            <div>
              <p className="text-sm font-medium">Automatic Email Notifications</p>
              <p className="text-xs text-muted-foreground">
                Master switch for all automated email delivery
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">
                {automaticEnabled ? "On" : "Off"}
              </span>
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input accent-primary"
                checked={automaticEnabled}
                onChange={(e) => setAutomaticEnabled(e.target.checked)}
              />
            </div>
          </label>
          <input
            type="hidden"
            name="automaticEmailNotificationsEnabled"
            value={automaticEnabled ? "true" : "false"}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment receipts</CardTitle>
          <CardDescription>
            Email sent after a payment is logged (in addition to SMS when configured).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChannelEditor
            channelKey="paymentReceiptEmail"
            channel={channels.paymentReceiptEmail}
            meta={CHANNEL_META.paymentReceiptEmail}
            onFieldChange={setChannelField}
            onRestoreDefault={() => restoreDefault("paymentReceiptEmail")}
            bodyRows={6}
            bodyPlaceholder="Leave empty to use the built-in receipt email layout."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Membership expiry reminders</CardTitle>
          <CardDescription>
            Automated emails on the schedule below. Each channel can be turned on or
            off independently.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {EXPIRY_CHANNEL_KEYS.map((key) => (
            <ChannelEditor
              key={key}
              channelKey={key}
              channel={channels[key]}
              meta={CHANNEL_META[key]}
              onFieldChange={setChannelField}
              onRestoreDefault={() => restoreDefault(key)}
              bodyRows={10}
              compactTitle
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Manual renewal reminder</CardTitle>
          <CardDescription>
            Template for the Send reminder action on Expired and Upcoming Renewals.
            This is not part of the automated expiry cron schedule.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChannelEditor
            channelKey="manualRenewalReminder"
            channel={channels.manualRenewalReminder}
            meta={CHANNEL_META.manualRenewalReminder}
            onFieldChange={setChannelField}
            onRestoreDefault={() => restoreDefault("manualRenewalReminder")}
            bodyRows={10}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personalization variables</CardTitle>
          <CardDescription>
            Use these tokens in subjects and messages. They are replaced per member
            when an email is sent.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-muted-foreground">
            After expiry,{" "}
            <code className="font-mono text-foreground">{`{{days_remaining}}`}</code>{" "}
            is negative (for example -7).
          </p>
          <ul className="space-y-2 text-xs text-muted-foreground">
            {variableHint.map((item) => (
              <li key={item.token} className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                <code className="shrink-0 font-mono text-foreground">{item.token}</code>
                <span>{item.meaning}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Payment receipt only:{" "}
            <code className="font-mono text-foreground">
              {`{{${PAYMENT_RECEIPT_EXTRA_TEMPLATE_VARIABLES[0]}}}`}
            </code>
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}

/** @deprecated Import EmailAutomationSettingsForm instead. */
export const NotificationSettingsForm = EmailAutomationSettingsForm;

function ChannelEditor({
  channelKey,
  channel,
  meta,
  onFieldChange,
  onRestoreDefault,
  bodyRows,
  bodyPlaceholder,
  compactTitle = false,
}: {
  channelKey: ChannelKey;
  channel: NotificationChannelSettings;
  meta: { title: string; description: string };
  onFieldChange: <K extends keyof NotificationChannelSettings>(
    key: ChannelKey,
    field: K,
    value: NotificationChannelSettings[K],
  ) => void;
  onRestoreDefault: () => void;
  bodyRows: number;
  bodyPlaceholder?: string;
  compactTitle?: boolean;
}) {
  return (
    <section
      className={
        compactTitle
          ? "space-y-4 rounded-lg border p-4"
          : "space-y-4"
      }
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className={compactTitle ? "text-sm font-medium" : "text-sm font-medium"}>
            {meta.title}
          </p>
          <p className="text-xs text-muted-foreground">{meta.description}</p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <span className="text-muted-foreground">
            {channel.enabled ? "On" : "Off"}
          </span>
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input accent-primary"
            checked={channel.enabled}
            onChange={(e) =>
              onFieldChange(channelKey, "enabled", e.target.checked)
            }
          />
        </label>
      </div>

      <input
        type="hidden"
        name={`${channelKey}.enabled`}
        value={channel.enabled ? "true" : "false"}
      />

      <div className="space-y-2">
        <Label htmlFor={`${channelKey}-subject`}>Subject</Label>
        <Input
          id={`${channelKey}-subject`}
          name={`${channelKey}.subject`}
          value={channel.subject}
          onChange={(e) => onFieldChange(channelKey, "subject", e.target.value)}
          disabled={!channel.enabled}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${channelKey}-body`}>Message</Label>
        <Textarea
          id={`${channelKey}-body`}
          name={`${channelKey}.body`}
          value={channel.body}
          onChange={(e) => onFieldChange(channelKey, "body", e.target.value)}
          rows={bodyRows}
          disabled={!channel.enabled}
          placeholder={bodyPlaceholder}
          className="font-mono text-sm"
        />
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={onRestoreDefault}
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Restore default
      </Button>
    </section>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="gap-2">
      <Bell className="h-4 w-4" />
      {pending ? "Saving..." : "Save email automation"}
    </Button>
  );
}
