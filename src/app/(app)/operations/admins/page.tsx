import { redirect } from "next/navigation";

import { requireGym } from "@/lib/session";
import { canManageStaff } from "@/lib/permissions";
import { withTenant } from "@/lib/db-context";
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

  const staffRows = await withTenant(user.gymId, (tx) =>
    tx.user.findMany({
      where: { gymId: user.gymId, role: { not: "SUPER_ADMIN" } },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      select: { id: true, name: true, email: true, role: true },
    }),
  );
  const staff = staffRows.map((s) => ({
    ...s,
    role: s.role as "OWNER" | "ADMIN" | "STAFF",
  }));

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
          <StaffManager staff={staff} currentUserId={user.id} />
        </CardContent>
      </Card>
    </div>
  );
}
