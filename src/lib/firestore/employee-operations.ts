import { adjustGymCounter } from "@/lib/firestore/gym-counters";
import { newDocId, platformContext } from "@/lib/firestore/helpers";
import { getRepositories } from "@/lib/firestore";
import type { CreateEmployeeInput } from "@/lib/firestore/repositories/employees";

export async function createEmployeeRecord(
  gymId: string,
  input: CreateEmployeeInput,
) {
  const { employees, gyms } = getRepositories();
  const id = newDocId();
  const doc = await employees.createEmployee(platformContext, gymId, id, input);
  await adjustGymCounter(gyms, gymId, "employeeCount", 1);
  return doc;
}

export async function deleteEmployeeRecord(
  gymId: string,
  id: string,
): Promise<boolean> {
  const { employees, gyms } = getRepositories();
  const doc = await employees.getById(platformContext, gymId, id);
  if (!doc) return false;

  await employees.delete(platformContext, gymId, id);
  await adjustGymCounter(gyms, gymId, "employeeCount", -1);
  return true;
}
