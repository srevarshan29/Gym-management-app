import { User, Building2 } from "lucide-react";

import { requireGym } from "@/lib/session";
import { canManageStaff } from "@/lib/permissions";
import { withTenant } from "@/lib/db-context";
import { getGymProfile } from "@/lib/gym-profile";
import { PageHeader } from "@/components/page-header";
import { AccountSettingsForm } from "@/components/account-settings-form";
import { GymProfileForm } from "@/components/gym-profile-form";
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

  const dbUser = await withTenant(user.gymId, (tx) =>
    tx.user.findFirst({
      where: { id: user.id, gymId: user.gymId },
      select: { name: true, email: true },
    }),
  );

  const gymProfile = isOwner ? await getGymProfile(user.gymId) : null;

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
    </div>
  );
}
