"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getRepositories, platformContext } from "@/lib/firestore";
import {
  createEmployeeRecord,
  deleteEmployeeRecord,
} from "@/lib/firestore/employee-operations";
import { requireGym } from "@/lib/session";
import { canManageEmployees } from "@/lib/permissions";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";

const employeeFieldsSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  phone: z.string().trim().min(3, "Phone number is required").max(30),
  position: z.string().trim().min(1, "Position is required").max(120),
  joiningDate: z.string().trim().min(1, "Joining date is required"),
  salary: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

function parseJoiningDate(value: string): Date | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function parseSalary(value: string | undefined): number | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  const num = Number(raw);
  if (Number.isNaN(num) || num < 0) return null;
  return num;
}

function revalidateEmployeesPath() {
  revalidatePath("/operations/employees");
}

export async function createEmployee(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireGym();
  if (!canManageEmployees(user.role)) {
    return actionError("You do not have permission to manage employees.");
  }

  const parsed = employeeFieldsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? "Invalid input.");
  }

  const joiningDate = parseJoiningDate(parsed.data.joiningDate);
  if (!joiningDate) {
    return actionError("Invalid joining date.");
  }

  const salaryRaw = parsed.data.salary;
  if (salaryRaw && salaryRaw.trim() !== "") {
    const salaryCheck = parseSalary(salaryRaw);
    if (salaryCheck === null) {
      return actionError("Enter a valid salary amount or leave it blank.");
    }
  }

  await createEmployeeRecord(user.gymId, {
    name: parsed.data.name,
    phone: parsed.data.phone,
    position: parsed.data.position,
    joiningDate,
    salary: parseSalary(parsed.data.salary),
    notes: parsed.data.notes || null,
  });

  revalidateEmployeesPath();
  return actionOk("Employee added.");
}

export async function updateEmployee(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireGym();
  if (!canManageEmployees(user.role)) {
    return actionError("You do not have permission to manage employees.");
  }

  const id = String(formData.get("id") ?? "");
  if (!id) return actionError("Missing employee id.");

  const parsed = employeeFieldsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? "Invalid input.");
  }

  const joiningDate = parseJoiningDate(parsed.data.joiningDate);
  if (!joiningDate) {
    return actionError("Invalid joining date.");
  }

  const salaryRaw = parsed.data.salary;
  if (salaryRaw && salaryRaw.trim() !== "") {
    const salaryCheck = parseSalary(salaryRaw);
    if (salaryCheck === null) {
      return actionError("Enter a valid salary amount or leave it blank.");
    }
  }

  const { employees } = getRepositories();
  const existing = await employees.getById(platformContext, user.gymId, id);
  if (!existing) {
    return actionError("Employee not found.");
  }

  await employees.updateEmployee(platformContext, user.gymId, id, {
    name: parsed.data.name,
    phone: parsed.data.phone,
    position: parsed.data.position,
    joiningDate,
    salary: parseSalary(parsed.data.salary),
    notes: parsed.data.notes || null,
  });

  revalidateEmployeesPath();
  return actionOk("Employee updated.");
}

export async function deleteEmployee(id: string): Promise<ActionResult> {
  const user = await requireGym();
  if (!canManageEmployees(user.role)) {
    return actionError("You do not have permission to manage employees.");
  }
  if (!id) return actionError("Missing employee id.");

  const deleted = await deleteEmployeeRecord(user.gymId, id);
  if (!deleted) {
    return actionError("Employee not found.");
  }

  revalidateEmployeesPath();
  return actionOk("Employee removed.");
}
