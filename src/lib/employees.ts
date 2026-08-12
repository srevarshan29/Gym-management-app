import { withTenant } from "@/lib/db-context";

export type EmployeeListItem = {
  id: string;
  name: string;
  phone: string;
  position: string;
  joiningDate: Date;
  salary: number | null;
  notes: string | null;
};

export async function getEmployees(tenantGymId: string): Promise<EmployeeListItem[]> {
  return withTenant(tenantGymId, (tx) =>
    tx.employee.findMany({
      where: { gymId: tenantGymId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        phone: true,
        position: true,
        joiningDate: true,
        salary: true,
        notes: true,
      },
    }),
  ).then((rows) =>
    rows.map((row) => ({
      ...row,
      salary: row.salary != null ? Number(row.salary) : null,
    })),
  );
}
