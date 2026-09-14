import { getRepositories } from "@/lib/firestore";

/** @deprecated Use runBillingTransaction + bumpMemberSeq — Prisma shim removed in Phase 2. */
export async function nextMemberNumber(
  _tx: unknown,
  gymId: string,
): Promise<number> {
  void _tx;
  const { gyms } = getRepositories();
  return gyms.nextMemberNumber(gymId);
}

/** @deprecated Use runBillingTransaction + bumpReceiptSeq — Prisma shim removed in Phase 2. */
export async function nextReceiptNumber(
  _tx: unknown,
  gymId: string,
): Promise<number> {
  void _tx;
  const { gyms } = getRepositories();
  return gyms.nextReceiptNumber(gymId);
}
