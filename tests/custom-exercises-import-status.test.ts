import { describe, expect, it, vi } from "vitest";

import type { StaffContext } from "@/lib/firestore/context";
import { CustomExercisesRepository } from "@/lib/firestore/repositories/custom-exercises";

type StoredExercise = {
  gymId: string;
  catalogId: string;
};

function staffCtx(gymId: string): StaffContext {
  return { kind: "staff", gymId, userId: "user-1", role: "OWNER" };
}

function buildImportStatusMock(rows: StoredExercise[]) {
  let queryCount = 0;

  const db = {
    collection: vi.fn(() => ({
      where: (field: string, op: string, value: unknown) => {
        const filters: Array<{ field: string; op: string; value: unknown }> = [
          { field, op, value },
        ];

        const chain = {
          where: (nextField: string, nextOp: string, nextValue: unknown) => {
            filters.push({ field: nextField, op: nextOp, value: nextValue });
            return chain;
          },
          get: vi.fn(async () => {
            queryCount += 1;
            const gymId = filters.find((filter) => filter.field === "gymId")?.value as
              | string
              | undefined;
            const catalogIds = filters.find(
              (filter) => filter.field === "catalogId" && filter.op === "in",
            )?.value as string[] | undefined;

            const docs = rows
              .filter(
                (row) =>
                  row.gymId === gymId &&
                  catalogIds?.includes(row.catalogId),
              )
              .map((row, index) => ({
                id: `ex-${row.catalogId}-${index}`,
                data: () => ({ gymId: row.gymId, catalogId: row.catalogId }),
              }));

            return { docs };
          }),
        };

        return chain;
      },
    })),
  };

  return {
    db: db as unknown as ConstructorParameters<typeof CustomExercisesRepository>[0],
    queryCount: () => queryCount,
  };
}

function catalogIds(count: number, prefix = "cat"): string[] {
  return Array.from({ length: count }, (_, index) => `${prefix}-${index + 1}`);
}

describe("CustomExercisesRepository.findImportedCatalogIds", () => {
  it("returns imported IDs for fewer than 30 candidates in one query", async () => {
    const { db, queryCount } = buildImportStatusMock([
      { gymId: "gym-a", catalogId: "cat-1" },
      { gymId: "gym-a", catalogId: "cat-3" },
    ]);
    const repo = new CustomExercisesRepository(db);

    const imported = await repo.findImportedCatalogIds(
      staffCtx("gym-a"),
      "gym-a",
      ["cat-1", "cat-2", "cat-3"],
    );

    expect(imported).toEqual(new Set(["cat-1", "cat-3"]));
    expect(queryCount()).toBe(1);
  });

  it("queries exactly one batch for 30 candidates", async () => {
    const ids = catalogIds(30);
    const { db, queryCount } = buildImportStatusMock([
      { gymId: "gym-a", catalogId: "cat-1" },
      { gymId: "gym-a", catalogId: "cat-30" },
    ]);
    const repo = new CustomExercisesRepository(db);

    const imported = await repo.findImportedCatalogIds(staffCtx("gym-a"), "gym-a", ids);

    expect(imported).toEqual(new Set(["cat-1", "cat-30"]));
    expect(queryCount()).toBe(1);
  });

  it("splits more than 30 candidates into multiple batched queries", async () => {
    const ids = catalogIds(65);
    const { db, queryCount } = buildImportStatusMock([
      { gymId: "gym-a", catalogId: "cat-1" },
      { gymId: "gym-a", catalogId: "cat-31" },
      { gymId: "gym-a", catalogId: "cat-65" },
    ]);
    const repo = new CustomExercisesRepository(db);

    const imported = await repo.findImportedCatalogIds(staffCtx("gym-a"), "gym-a", ids);

    expect(imported).toEqual(new Set(["cat-1", "cat-31", "cat-65"]));
    expect(queryCount()).toBe(3);
  });

  it("deduplicates candidate IDs before querying", async () => {
    const { db, queryCount } = buildImportStatusMock([
      { gymId: "gym-a", catalogId: "cat-1" },
    ]);
    const repo = new CustomExercisesRepository(db);

    const imported = await repo.findImportedCatalogIds(
      staffCtx("gym-a"),
      "gym-a",
      ["cat-1", "cat-1", "cat-2", "", "cat-1"],
    );

    expect(imported).toEqual(new Set(["cat-1"]));
    expect(queryCount()).toBe(1);
  });

  it("excludes imported IDs from another gym", async () => {
    const { db } = buildImportStatusMock([
      { gymId: "gym-a", catalogId: "cat-1" },
      { gymId: "gym-b", catalogId: "cat-2" },
    ]);
    const repo = new CustomExercisesRepository(db);

    const imported = await repo.findImportedCatalogIds(
      staffCtx("gym-a"),
      "gym-a",
      ["cat-1", "cat-2"],
    );

    expect(imported).toEqual(new Set(["cat-1"]));
  });

  it("does not query Firestore for empty input", async () => {
    const { db, queryCount } = buildImportStatusMock([]);
    const repo = new CustomExercisesRepository(db);

    const imported = await repo.findImportedCatalogIds(staffCtx("gym-a"), "gym-a", []);

    expect(imported).toEqual(new Set());
    expect(queryCount()).toBe(0);
    expect(db.collection).not.toHaveBeenCalled();
  });

  it("rejects cross-tenant access before querying", async () => {
    const { db, queryCount } = buildImportStatusMock([]);
    const repo = new CustomExercisesRepository(db);

    await expect(
      repo.findImportedCatalogIds(staffCtx("gym-a"), "gym-b", ["cat-1"]),
    ).rejects.toThrow(/Tenant isolation violation/);
    expect(queryCount()).toBe(0);
  });
});
