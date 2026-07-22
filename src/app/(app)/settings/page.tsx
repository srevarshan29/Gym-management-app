import { User, Building2, ShieldCheck } from "lucide-react";

import { requireGym } from "@/lib/session";
import { canManageStaff } from "@/lib/permissions";
import { withTenant } from "@/lib/db-context";
import { getGymProfile } from "@/lib/gym-profile";
import { PageHeader } from "@/components/page-header";
import { AccountSettingsForm } from "@/components/account-settings-form";
import { StaffManager } from "@/components/staff-manager";
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

  const staffRows = isOwner
    ? await withTenant(user.gymId, (tx) =>
        tx.user.findMany({
          where: { gymId: user.gymId, role: { not: "SUPER_ADMIN" } },
          orderBy: [{ role: "asc" }, { createdAt: "asc" }],
          select: { id: true, name: true, email: true, role: true },
        }),
      )
    : [];
  const staff = staffRows.map((s) => ({
    ...s,
    role: s.role as "OWNER" | "ADMIN" | "STAFF",
  }));
  const gymProfile = isOwner ? await getGymProfile(user.gymId) : null;

  return (
    <div>
      <PageHeader
        title="Settings"
        description={
          isOwner
            ? "Manage your account, gym profile, and staff."
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
        <>
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

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                Roles &amp; permissions
              </CardTitle>
              <CardDescription>
                Owners see gym-wide revenue reports. Admins and staff can view
                subs, paid, and pending amounts per member and log payments
                without accessing payment history totals.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
              <RoleCard
                title="Owner"
                points={[
                  "Everything below",
                  "View payments & revenue reports",
                  "Delete members",
                  "Manage staff accounts",
                ]}
              />
              <RoleCard
                title="Admin"
                points={[
                  "Add & edit members",
                  "Renew subscriptions",
                  "View subs, paid & pending per member",
                  "Log payments for members",
                  "Create & edit packages",
                ]}
              />
              <RoleCard
                title="Staff"
                points={[
                  "Add & edit members",
                  "Renew subscriptions",
                  "View subs, paid & pending per member",
                  "Log payments for members",
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Staff accounts</CardTitle>
              <CardDescription>
                {staff.length} account{staff.length === 1 ? "" : "s"}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StaffManager staff={staff} currentUserId={user.id} />
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function RoleCard({ title, points }: { title: string; points: string[] }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="mb-2 font-display font-semibold">{title}</p>
      <ul className="space-y-1 text-muted-foreground">
        {points.map((p) => (
          <li key={p}>• {p}</li>
        ))}
      </ul>
    </div>
  );
}
