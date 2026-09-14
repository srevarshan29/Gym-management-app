import { getRepositories, platformContext } from "@/lib/firestore";
import {
  EMPLOYEES_PAGE_SIZE,
  type EmployeesPageResult,
} from "@/lib/firestore/repositories/employees";

export { EMPLOYEES_PAGE_SIZE };

export type EmployeeListItem = {
  id: string;
  name: string;
  phone: string;
  position: string;
  joiningDate: Date;
  salary: number | null;
  notes: string | null;
};

function toListItem(doc: {
  id: string;
  name: string;
  phone: string;
  position: string;
  joiningDate: { toDate(): Date };
  salary: number | null;
  notes: string | null;
}): EmployeeListItem {
  return {
    id: doc.id,
    name: doc.name,
    phone: doc.phone,
    position: doc.position,
    joiningDate: doc.joiningDate.toDate(),
    salary: doc.salary,
    notes: doc.notes,
  };
}

export async function getEmployeesPage(
  tenantGymId: string,
  page = 1,
): Promise<EmployeesPageResult & { employees: EmployeeListItem[] }> {
  const { employees } = getRepositories();
  const result = await employees.listEmployeePage(platformContext, tenantGymId, {
    page,
    pageSize: EMPLOYEES_PAGE_SIZE,
  });

  return {
    ...result,
    employees: result.items.map(toListItem),
  };
}

/** Full list for CSV export (cursor-paged, capped at 1000 rows). */
export async function getEmployees(
  tenantGymId: string,
): Promise<EmployeeListItem[]> {
  const { employees } = getRepositories();
  const rows = await employees.listAllByName(platformContext, tenantGymId);
  return rows.map(toListItem);
}
