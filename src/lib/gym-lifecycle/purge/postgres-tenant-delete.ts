import { POSTGRES_GYM_SCOPED_TABLES } from "@/lib/seed/tenant-id-reconciliation";

/**
 * Deletes Postgres tenant rows for a single gym in dependency-safe order.
 * Workout mirror tables without Prisma FKs are deleted before gym-scoped models.
 */
export async function deletePostgresTenantRecords(gymId: string): Promise<void> {
  if (gymId.trim().length < 1) {
    throw new Error("gymId is required.");
  }

  const { prisma } = await import("@/lib/prisma");

  const rawTables = POSTGRES_GYM_SCOPED_TABLES.filter(
    (t): t is (typeof POSTGRES_GYM_SCOPED_TABLES)[number] & { rawTable: string } =>
      "rawTable" in t && typeof (t as { rawTable?: string }).rawTable === "string",
  ).map((t) => t.rawTable);
  for (const table of rawTables) {
    await prisma.$executeRawUnsafe(`DELETE FROM "${table}" WHERE "gymId" = $1`, gymId);
  }

  await prisma.receipt.deleteMany({ where: { gymId } });
  await prisma.payment.deleteMany({ where: { gymId } });
  await prisma.subscription.deleteMany({ where: { gymId } });
  await prisma.ledgerTransaction.deleteMany({ where: { gymId } });
  await prisma.member.deleteMany({ where: { gymId } });
  await prisma.package.deleteMany({ where: { gymId } });
  await prisma.visitor.deleteMany({ where: { gymId } });
  await prisma.employee.deleteMany({ where: { gymId } });
  await prisma.gymEvent.deleteMany({ where: { gymId } });
  await prisma.exercise.deleteMany({ where: { gymId } });
  await prisma.workoutPlanExercise.deleteMany({ where: { gymId } });
  await prisma.workoutPlanDay.deleteMany({ where: { gymId } });
  await prisma.workoutPlan.deleteMany({ where: { gymId } });
  await prisma.dietPlan.deleteMany({ where: { gymId } });
  await prisma.gymProfile.deleteMany({ where: { gymId } });
  await prisma.user.deleteMany({ where: { gymId } });
  await prisma.gym.deleteMany({ where: { id: gymId } });
}