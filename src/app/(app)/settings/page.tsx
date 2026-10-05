import Link from "next/link";
import { User, Building2, Mail, ChevronRight, QrCode } from "lucide-react";

import { getRepositories, type StaffContext } from "@/lib/firestore";
import { getGymProfile } from "@/lib/gym-profile";
import {
  canManageMembers,
  canManageNotificationSettings,
  canManageStaff,
} from "@/lib/permissions";
import { requireGym } from "@/lib/session";
import { PageHeader } from "@/components/page-header";
import { AccountSettingsForm } from "@/components/account-settings-form";
import { ExerciseCatalogAttribution } from "@/components/exercise-catalog-attribution";
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
  const canEditEmailAutomation = canManageNotificationSettings(user.role);
  const canShowMemberPortalQr = canManageMembers(user.role);

  const ctx: StaffContext = {
    kind: "staff",
    userId: user.id,
    gymId: user.gymId,
    role: user.role,
  };
  const { users } = getRepositories();
  const dbUser = await users.findById(ctx, user.id);

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

      {canShowMemberPortalQr ? (
        <Link href="/settings/member-portal" className="mb-6 block">
          <Card className="transition-colors hover:bg-muted/40">
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-base">
                  <QrCode className="h-5 w-5 text-muted-foreground" />
                  Member Portal QR
                </CardTitle>
                <CardDescription>
                  View and share the permanent QR code members scan to sign in to
                  their portal.
                </CardDescription>
              </div>
              <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
            </CardHeader>
          </Card>
        </Link>
      ) : null}

      {canEditEmailAutomation ? (
        <Link href="/settings/email" className="mb-6 block">
          <Card className="transition-colors hover:bg-muted/40">
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  Email Automation
                </CardTitle>
                <CardDescription>
                  Manage payment receipts, membership expiry reminders, and other
                  automated emails.
                </CardDescription>
              </div>
              <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
            </CardHeader>
          </Card>
        </Link>
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
