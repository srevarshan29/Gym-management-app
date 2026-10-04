import { User, Building2, Bell } from "lucide-react";

import { getRepositories, type StaffContext } from "@/lib/firestore";
import { getGymProfile } from "@/lib/gym-profile";
import { defaultGymNotificationSettings } from "@/lib/notification-settings/defaults";
import { getGymNotificationSettings } from "@/lib/notification-settings/get-settings";
import { canManageNotificationSettings, canManageStaff } from "@/lib/permissions";
import { requireGym } from "@/lib/session";
import { PageHeader } from "@/components/page-header";
import { AccountSettingsForm } from "@/components/account-settings-form";
import { ExerciseCatalogAttribution } from "@/components/exercise-catalog-attribution";
import { GymProfileForm } from "@/components/gym-profile-form";
import { NotificationSettingsForm } from "@/components/notification-settings-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function SettingsPage() {
  const user = await requireGym();
  const isOwner = canManageStaff(user.role);
  const canEditNotifications = canManageNotificationSettings(user.role);

  const ctx: StaffContext = {
    kind: "staff",
    userId: user.id,
    gymId: user.gymId,
    role: user.role,
  };
  const { users } = getRepositories();
  const dbUser = await users.findById(ctx, user.id);

  const gymProfile = isOwner ? await getGymProfile(user.gymId) : null;
  const notificationSettings = canEditNotifications
    ? await getGymNotificationSettings(user.gymId)
    : null;
  const notificationDefaults = defaultGymNotificationSettings(user.gymId);

  return (
    <div>
      <PageHeader
        title="Settings"
        description={
          isOwner
            ? "Manage your account and gym profile."
            : "Manage your account settings."
        }
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-muted-foreground" />
            My profile
          </CardTitle>
          <CardDescription>
            Update the display name shown throughout the app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AccountSettingsForm
            name={dbUser?.name ?? user.name ?? ""}
            email={dbUser?.email ?? user.email ?? ""}
          />
        </CardContent>
      </Card>

      {isOwner && gymProfile ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              Gym profile
            </CardTitle>
            <CardDescription>
              Shown on printed/emailed payment receipts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GymProfileForm profile={gymProfile} />
          </CardContent>
        </Card>
      ) : null}

      {canEditNotifications && notificationSettings ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-muted-foreground" />
              Notifications
            </CardTitle>
            <CardDescription>
              Email automation for payment receipts and membership expiry reminders.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NotificationSettingsForm
              settings={notificationSettings}
              defaults={{
                paymentReceiptEmail: notificationDefaults.paymentReceiptEmail,
                membershipExpiry7Day: notificationDefaults.membershipExpiry7Day,
                membershipExpiry3Day: notificationDefaults.membershipExpiry3Day,
              }}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Exercise catalog</CardTitle>
          <CardDescription>
            Information about imported exercise metadata and demonstration media.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ExerciseCatalogAttribution />
        </CardContent>
      </Card>
    </div>
  );
}
