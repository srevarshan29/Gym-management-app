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

type ChannelKey =
  | "paymentReceiptEmail"
  | "membershipExpiry7Day"
  | "membershipExpiry3Day";

const CHANNEL_META: Record<
  ChannelKey,
  { title: string; description: string }
> = {
  paymentReceiptEmail: {
    title: "Payment receipt email",
    description:
      "Sent to the member (and owner copy when configured) after a payment is logged. SMS is not affected.",
  },
  membershipExpiry7Day: {
    title: "Membership expiry — 7 days",
    description: "Email reminder sent 7 days before the member's end date.",
  },
  membershipExpiry3Day: {
    title: "Membership expiry — 3 days",
    description: "Email reminder sent 3 days before the member's end date.",
  },
};

type Props = {
  settings: GymNotificationSettingsData;
  defaults: GymNotificationSettingsFormDefaults;
};

export function NotificationSettingsForm({ settings, defaults }: Props) {
  const guardedAction = useGuardedFormAction(updateGymNotificationSettings);
  const [state, formAction] = useFormState<ActionResult | undefined, FormData>(
    guardedAction,
    undefined,
  );

  const [channels, setChannels] = React.useState<
    Record<ChannelKey, NotificationChannelSettings>
  >({
    paymentReceiptEmail: settings.paymentReceiptEmail,
    membershipExpiry7Day: settings.membershipExpiry7Day,
    membershipExpiry3Day: settings.membershipExpiry3Day,
  });

  React.useEffect(() => {
    if (!state) return;
    if (state.ok) toast.success(state.message ?? "Notification settings saved.");
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
      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="mb-2 text-sm font-medium">Personalization variables</p>
        <p className="mb-3 text-xs text-muted-foreground">
          Type these tokens in the subject or message. They are replaced with each
          member&apos;s details when an email is sent. One template applies to all
          members.
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
      </div>

      {(Object.keys(CHANNEL_META) as ChannelKey[]).map((key) => {
        const meta = CHANNEL_META[key];
        const channel = channels[key];
        return (
          <section key={key} className="space-y-4 rounded-lg border p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-medium">{meta.title}</p>
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
                    setChannelField(key, "enabled", e.target.checked)
                  }
                />
              </label>
            </div>

            <input
              type="hidden"
              name={`${key}.enabled`}
              value={channel.enabled ? "true" : "false"}
            />

            <div className="space-y-2">
              <Label htmlFor={`${key}-subject`}>Subject</Label>
              <Input
                id={`${key}-subject`}
                name={`${key}.subject`}
                value={channel.subject}
                onChange={(e) => setChannelField(key, "subject", e.target.value)}
                disabled={!channel.enabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${key}-body`}>Message</Label>
              <Textarea
                id={`${key}-body`}
                name={`${key}.body`}
                value={channel.body}
                onChange={(e) => setChannelField(key, "body", e.target.value)}
                rows={key === "paymentReceiptEmail" ? 6 : 10}
                disabled={!channel.enabled}
                placeholder={
                  key === "paymentReceiptEmail"
                    ? "Leave empty to use the built-in receipt email layout."
                    : undefined
                }
                className="font-mono text-sm"
              />
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => restoreDefault(key)}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restore default
            </Button>
          </section>
        );
      })}

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="gap-2">
      <Bell className="h-4 w-4" />
      {pending ? "Saving..." : "Save notifications"}
    </Button>
  );
}
