import { redirect } from "next/navigation";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { defaultGymNotificationSettings } from "@/lib/notification-settings/defaults";
import { getGymNotificationSettings } from "@/lib/notification-settings/get-settings";
import { canManageNotificationSettings } from "@/lib/permissions";
import { requireGym } from "@/lib/session";
import { PageHeader } from "@/components/page-header";
import { EmailAutomationSettingsForm } from "@/components/notification-settings-form";
import { countInactiveMemberEmailRecipients } from "@/lib/inactive-member-reminders/targets";

export default async function EmailAutomationSettingsPage() {
  const user = await requireGym();
  if (!canManageNotificationSettings(user.role)) {
    redirect("/settings");
  }

  const notificationSettings = await getGymNotificationSettings(user.gymId);
  const notificationDefaults = defaultGymNotificationSettings(user.gymId);
  const inactiveBulkRecipientCount = await countInactiveMemberEmailRecipients(
    user.gymId,
  );
  const { gymId: _gymId, ...formDefaults } = notificationDefaults;

  return (
    <div>
      <PageHeader
        title="Email Automation"
        description="Payment receipts, membership expiry reminders, inactive member emails, and manual renewal templates."
      >
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Settings
        </Link>
      </PageHeader>

      <EmailAutomationSettingsForm
        settings={notificationSettings}
        defaults={formDefaults}
        inactiveBulkRecipientCount={inactiveBulkRecipientCount}
      />
    </div>
  );
}
