import { redirect } from "next/navigation";

import { getRepositories, type StaffContext } from "@/lib/firestore";
import { canManageStaff } from "@/lib/permissions";
import { requireGym } from "@/lib/session";
import { PageHeader } from "@/components/page-header";
import { StaffRolesReference } from "@/components/staff-roles-reference";
import { StaffManager } from "@/components/staff-manager";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function AdminsPage() {
  const user = await requireGym();
  if (!canManageStaff(user.role)) {
    redirect("/");
  }

  const ctx: StaffContext = {
    kind: "staff",
    userId: user.id,
    gymId: user.gymId,
    role: user.role,
  };

  const { users } = getRepositories();
  const staff = await users.listStaffByGym(ctx, user.gymId);

  return (
    <div>
      <PageHeader
        title="Admins"
        description="Manage staff login accounts and roles for your gym."
      />

      <StaffRolesReference />

      <Card>
        <CardHeader>
          <CardTitle>Staff accounts</CardTitle>
          <CardDescription>
            {staff.length} account{staff.length === 1 ? "" : "s"}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StaffManager
            staff={staff}
            currentUserId={user.id}
            currentUserRole={user.role as "OWNER" | "ADMIN" | "STAFF"}
          />
        </CardContent>
      </Card>
    </div>
  );
}
