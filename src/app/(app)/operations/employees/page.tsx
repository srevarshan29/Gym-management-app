import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

import { requireGym } from "@/lib/session";
import { canManageEmployees } from "@/lib/permissions";
import { getEmployeesPage } from "@/lib/employees";
import { PageHeader } from "@/components/page-header";
import { EmployeeDialog } from "@/components/employee-dialog";
import { EmployeesList } from "@/components/employees-list";
import { ProgrammePlansPageSkeleton } from "@/components/page-loading-skeletons";
import { Button } from "@/components/ui/button";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams?: { page?: string };
}) {
  const user = await requireGym();
  if (!canManageEmployees(user.role)) {
    redirect("/");
  }
  const page = Number(searchParams?.page ?? "1");

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

      <Suspense key={page} fallback={<ProgrammePlansPageSkeleton />}>
        <EmployeesPageContent gymId={user.gymId} page={page} />
      </Suspense>
    </div>
  );
}

async function EmployeesPageContent({
  gymId,
  page,
}: {
  gymId: string;
  page: number;
}) {
  const result = await getEmployeesPage(gymId, page);

  const employees = result.employees.map((row) => ({
    id: row.id,
    name: row.name,
    phone: row.phone,
    position: row.position,
    joiningDate: row.joiningDate.toISOString(),
    salary: row.salary,
    notes: row.notes,
  }));

  return (
    <EmployeesList
      employees={employees}
      page={result.page}
      pageSize={result.pageSize}
      total={result.total}
    />
  );
}
