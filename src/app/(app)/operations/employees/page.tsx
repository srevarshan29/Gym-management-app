import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

import { requireGym } from "@/lib/session";
import { canManageEmployees } from "@/lib/permissions";
import { getEmployees } from "@/lib/employees";
import { PageHeader } from "@/components/page-header";
import { EmployeeDialog } from "@/components/employee-dialog";
import { EmployeesList } from "@/components/employees-list";
import { ProgrammePlansPageSkeleton } from "@/components/page-loading-skeletons";
import { Button } from "@/components/ui/button";

export default async function EmployeesPage() {
  const user = await requireGym();
  if (!canManageEmployees(user.role)) {
    redirect("/");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employees"
        description="People who work at your gym — separate from app login accounts under Admins."
      >
        <EmployeeDialog
          trigger={
            <Button className="gap-1">
              <Plus className="h-4 w-4" /> Add employee
            </Button>
          }
        />
      </PageHeader>

      <Suspense fallback={<ProgrammePlansPageSkeleton />}>
        <EmployeesPageContent gymId={user.gymId} />
      </Suspense>
    </div>
  );
}

async function EmployeesPageContent({ gymId }: { gymId: string }) {
  const rows = await getEmployees(gymId);

  const employees = rows.map((row) => ({
    id: row.id,
    name: row.name,
    phone: row.phone,
    position: row.position,
    joiningDate: row.joiningDate.toISOString(),
    salary: row.salary,
    notes: row.notes,
  }));

  return <EmployeesList employees={employees} />;
}
