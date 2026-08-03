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

export async function getEmployees(gymId: string): Promise<EmployeeListItem[]> {
  return withTenant(gymId, (tx) =>
    tx.employee.findMany({
      where: { gymId },
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
