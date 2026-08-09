import { User, Building2, AlertTriangle } from "lucide-react";

import { requireGym } from "@/lib/session";
import { canManageStaff, canDeleteMembers } from "@/lib/permissions";
import { withTenant } from "@/lib/db-context";
import { getGymProfile } from "@/lib/gym-profile";
import { PageHeader } from "@/components/page-header";
import { AccountSettingsForm } from "@/components/account-settings-form";
import { GymProfileForm } from "@/components/gym-profile-form";
import { BulkDeleteMembersSettings } from "@/components/bulk-delete-members-settings";
import { ClearAllMemberEmailsSettings } from "@/components/clear-all-member-emails-settings";
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

  const memberCount =
    isOwner && canDeleteMembers(user.role)
      ? await withTenant(user.gymId, (tx) =>
          tx.member.count({ where: { gymId: user.gymId } }),
        )
      : 0;

  const membersWithEmailCount =
    isOwner && canDeleteMembers(user.role)
      ? await withTenant(user.gymId, (tx) =>
          tx.member.count({
            where: { gymId: user.gymId, email: { not: null } },
          }),
        )
      : 0;

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

      {canDeleteMembers(user.role) ? (
        <Card className="mb-6 border-destructive/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Testing utilities
            </CardTitle>
            <CardDescription>
              Destructive actions for resetting member data in this gym. Owner
              only.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col gap-3 border-b border-border/60 pb-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">Delete all members</p>
                <p className="text-sm text-muted-foreground">
                  {memberCount === 0
                    ? "No members in this gym."
                    : `Removes ${memberCount} member${memberCount === 1 ? "" : "s"} and all related billing data.`}
                </p>
              </div>
              <BulkDeleteMembersSettings memberCount={memberCount} />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">Clear all member emails</p>
                <p className="text-sm text-muted-foreground">
                  {memberCount === 0
                    ? "No members in this gym."
                    : `Clears email on ${memberCount} member${memberCount === 1 ? "" : "s"}; keeps records and subscriptions.`}
                </p>
              </div>
              <ClearAllMemberEmailsSettings
                memberCount={memberCount}
                membersWithEmailCount={membersWithEmailCount}
              />
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
