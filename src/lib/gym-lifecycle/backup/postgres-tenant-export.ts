import { POSTGRES_GYM_SCOPED_TABLES } from "@/lib/seed/tenant-id-reconciliation";

export type PostgresTableExport = {
  table: string;
  rows: unknown[];
  rowCount: number;
};

export const POSTGRES_EXPORT_PAGE_SIZE = 500;

export type PostgresExportAdapter = {
  exportTable: (table: string, gymId: string) => Promise<unknown[]>;
};

export async function exportSinglePostgresTableForTenant(
  adapter: PostgresExportAdapter,
  gymId: string,
  tableName: string,
): Promise<PostgresTableExport> {
  const rows = await adapter.exportTable(tableName, gymId);
  for (const row of rows) {
    if (typeof row === "object" && row !== null && "gymId" in row) {
      const record = row as { gymId?: string | null };
      if (record.gymId != null && record.gymId !== gymId) {
        throw new Error(`Postgres row in ${tableName} has unexpected gymId.`);
      }
    }
  }
  return { table: tableName, rows, rowCount: rows.length };
}

export async function exportPostgresTenantTables(
  adapter: PostgresExportAdapter,
  gymId: string,
): Promise<PostgresTableExport[]> {
  const out: PostgresTableExport[] = [];
  for (const table of POSTGRES_GYM_SCOPED_TABLES) {
    const tableName =
      "rawTable" in table && typeof (table as { rawTable?: string }).rawTable === "string"
        ? (table as { rawTable: string }).rawTable
        : table.prismaModel ?? table.label;
    const rows = await adapter.exportTable(tableName, gymId);
    for (const row of rows) {
      if (typeof row === "object" && row !== null && "gymId" in row) {
        const record = row as { gymId?: string | null };
        if (record.gymId != null && record.gymId !== gymId) {
          throw new Error(`Postgres row in ${tableName} has unexpected gymId.`);
        }
      }
    }
    out.push({ table: tableName, rows, rowCount: rows.length });
  }
  return out;
}

/** Production adapter — read-only; never invoked during unit tests. */
export async function createPrismaPostgresExportAdapter(): Promise<PostgresExportAdapter> {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error(
      "PostgreSQL tenant export is unavailable: DATABASE_URL is not configured.",
    );
  }
  const { prisma } = await import("@/lib/prisma");

  async function fetchPrismaPage(
    table:
      | "user"
      | "member"
      | "package"
      | "subscription"
      | "payment"
      | "receipt"
      | "gymProfile"
      | "visitor"
      | "employee"
      | "gymEvent"
      | "ledgerTransaction"
      | "exercise"
      | "workoutPlan"
      | "workoutPlanDay"
      | "workoutPlanExercise"
      | "dietPlan",
    gymId: string,
    skip: number,
  ): Promise<unknown[]> {
    const args = {
      where: { gymId },
      skip,
      take: POSTGRES_EXPORT_PAGE_SIZE,
      orderBy: { id: "asc" as const },
    };
    switch (table) {
      case "user":
        return prisma.user.findMany(args);
      case "member":
        return prisma.member.findMany(args);
      case "package":
        return prisma.package.findMany(args);
      case "subscription":
        return prisma.subscription.findMany(args);
      case "payment":
        return prisma.payment.findMany(args);
      case "receipt":
        return prisma.receipt.findMany(args);
      case "gymProfile":
        return prisma.gymProfile.findMany(args);
      case "visitor":
        return prisma.visitor.findMany(args);
      case "employee":
        return prisma.employee.findMany(args);
      case "gymEvent":
        return prisma.gymEvent.findMany(args);
      case "ledgerTransaction":
        return prisma.ledgerTransaction.findMany(args);
      case "exercise":
        return prisma.exercise.findMany(args);
      case "workoutPlan":
        return prisma.workoutPlan.findMany(args);
      case "workoutPlanDay":
        return prisma.workoutPlanDay.findMany(args);
      case "workoutPlanExercise":
        return prisma.workoutPlanExercise.findMany(args);
      case "dietPlan":
        return prisma.dietPlan.findMany(args);
      default:
        throw new Error(`Unsupported paginated postgres table: ${table}`);
    }
  }

  async function fetchRawPage(table: string, gymId: string, skip: number): Promise<unknown[]> {
    return prisma.$queryRawUnsafe(
      `SELECT * FROM "${table}" WHERE "gymId" = $1 ORDER BY "id" ASC LIMIT $2 OFFSET $3`,
      gymId,
      POSTGRES_EXPORT_PAGE_SIZE,
      skip,
    );
  }

  async function exportAllRows(table: string, gymId: string): Promise<unknown[]> {
    if (table === "gym") {
      return prisma.gym.findMany({ where: { id: gymId } });
    }
    return collectPaginatedPostgresRows(async (skip) => {
      if (table === "WorkoutSession" || table === "WorkoutSessionExercise" || table === "WorkoutSetLog") {
        return fetchRawPage(table, gymId, skip);
      }
      return fetchPrismaPage(table as Parameters<typeof fetchPrismaPage>[0], gymId, skip);
    });
  }

  return {
    async exportTable(table, gymId) {
      if (!expectedPostgresExportTableNamesForAdapter().includes(table)) {
        throw new Error(`Unsupported postgres export table: ${table}`);
      }
      return exportAllRows(table, gymId);
    },
  };
}

export async function collectPaginatedPostgresRows(
  fetchPage: (skip: number) => Promise<unknown[]>,
): Promise<unknown[]> {
  const rows: unknown[] = [];
  let skip = 0;
  for (;;) {
    const page = await fetchPage(skip);
    rows.push(...page);
    if (page.length < POSTGRES_EXPORT_PAGE_SIZE) break;
    skip += POSTGRES_EXPORT_PAGE_SIZE;
  }
  return rows;
}

function expectedPostgresExportTableNamesForAdapter(): string[] {
  return POSTGRES_GYM_SCOPED_TABLES.map((t) =>
    "rawTable" in t && typeof (t as { rawTable?: string }).rawTable === "string"
      ? (t as { rawTable: string }).rawTable
      : t.prismaModel ?? t.label,
  );
}