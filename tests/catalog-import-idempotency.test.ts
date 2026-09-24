import { Timestamp } from "firebase-admin/firestore";
import { describe, expect, it } from "vitest";

import {
  catalogImportLockDocId,
  importCatalogExerciseInTransaction,
  isValidCatalogImportExercise,
  pickCanonicalCatalogExercise,
  type CatalogImportWriteParams,
} from "@/lib/catalog/catalog-import";
import { COLLECTIONS } from "@/lib/firestore/collections";
import type { StaffContext } from "@/lib/firestore/context";
import type { CustomExerciseDoc, ExerciseCatalogDoc } from "@/lib/firestore/types";

function staffCtx(gymId: string, role: StaffContext["role"]): StaffContext {
  return { kind: "staff", userId: "user-1", gymId, role };
}

function catalogDoc(
  overrides: Partial<ExerciseCatalogDoc> = {},
): ExerciseCatalogDoc {
  const now = Timestamp.fromDate(new Date("2026-09-20T00:00:00Z"));
  const catalogId = overrides.catalogId ?? "dev-push-up";
  return {
    catalogId,
    name: "Push Up",
    nameLower: "push up",
    muscleGroup: "CHEST",
    description: "Bodyweight push.",
    instructions: ["Step one."],
    tips: null,
    equipment: null,
    bodyPart: null,
    difficulty: "beginner",
    movementPattern: null,
    primaryMuscles: ["pectorals"],
    secondaryMuscles: null,
    safetyNotes: null,
    category: null,
    isBodyweight: true,
    media: {
      primaryImageUrl: null,
      secondaryImageUrl: null,
      thumbnailUrl: null,
    },
    provider: {
      provider: "gym",
      providerExerciseId: catalogId,
      attributionText: null,
      attributionUrl: null,
      licenseTier: null,
    },
    catalogVersion: "dev-fixture-v1",
    searchPrefixes: ["pus", "push"],
    isActive: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function catalogExercise(
  id: string,
  overrides: Partial<CustomExerciseDoc> = {},
): CustomExerciseDoc {
  const now =
    overrides.createdAt ??
    Timestamp.fromDate(new Date("2026-09-20T00:00:00Z"));
  return {
    gymId: "gym-a",
    name: "Push Up",
    nameLower: "push up",
    muscleGroup: "CHEST",
    defaultSets: null,
    defaultReps: null,
    defaultTempo: null,
    defaultRestSeconds: null,
    trackingType: "BODYWEIGHT",
    isSeeded: false,
    exerciseSource: "CATALOG",
    catalogId: "dev-push-up",
    importedCatalogVersion: "dev-fixture-v1",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

type QueryFilter = { field: string; op: string; value: unknown };

function createMockImportDb(initial: {
  lock?: { gymId: string; catalogId: string; exerciseId: string } | null;
  catalog?: ExerciseCatalogDoc | null;
  exercises?: Record<string, CustomExerciseDoc>;
}) {
  const store: Record<string, Record<string, unknown>> = {
    [COLLECTIONS.catalogImportLocks]: {},
    [COLLECTIONS.exerciseCatalog]: {},
    [COLLECTIONS.customExercises]: {},
  };

  if (initial.exercises) {
    for (const [id, doc] of Object.entries(initial.exercises)) {
      store[COLLECTIONS.customExercises]![id] = doc;
    }
  }

  if (initial.lock) {
    const lockId = catalogImportLockDocId(initial.lock.gymId, initial.lock.catalogId);
    store[COLLECTIONS.catalogImportLocks]![lockId] = {
      gymId: initial.lock.gymId,
      catalogId: initial.lock.catalogId,
      exerciseId: initial.lock.exerciseId,
    };
  }

  if (initial.catalog) {
    store[COLLECTIONS.exerciseCatalog]![initial.catalog.catalogId] = initial.catalog;
  }

  const writes = {
    sets: [] as Array<{ collection: string; id: string; data: unknown }>,
  };

  let transactionChain = Promise.resolve();

  function buildQuery(collection: string, filters: QueryFilter[]) {
    return {
      collection,
      filters,
      get: async () => {
        const docs = Object.entries(store[collection] ?? {})
          .filter(([, data]) =>
            filters.every((filter) => {
              if (filter.op !== "==") return false;
              return (data as Record<string, unknown>)[filter.field] === filter.value;
            }),
          )
          .map(([id, data]) => ({ id, data: () => data }));
        return { docs, empty: docs.length === 0, exists: false, data: () => undefined };
      },
    };
  }

  function makeQuery(collection: string, filters: QueryFilter[]) {
    return {
      collection,
      filters,
      where: (field: string, op: string, value: unknown) =>
        makeQuery(collection, [...filters, { field, op, value }]),
    };
  }

  const db = {
    collection: (name: string) => ({
      doc: (id: string) => ({ collection: name, id }),
      where: (field: string, op: string, value: unknown) =>
        makeQuery(name, [{ field, op, value }]),
    }),
    runTransaction: async <T>(fn: (tx: {
      get: (ref: { collection: string; id?: string; filters?: QueryFilter[] }) => Promise<{
        exists: boolean;
        data: () => unknown;
        docs?: Array<{ id: string; data: () => unknown }>;
      }>;
      set: (ref: { collection: string; id: string }, data: unknown) => void;
    }) => Promise<T>) => {
      let result!: T;
      transactionChain = transactionChain.then(async () => {
        const tx = {
          get: async (ref: { collection: string; id?: string; filters?: QueryFilter[] }) => {
            if (ref.filters) {
              return buildQuery(ref.collection, ref.filters).get();
            }
            const data = store[ref.collection]?.[ref.id!];
            return { exists: data !== undefined, data: () => data };
          },
          set: (ref: { collection: string; id: string }, data: unknown) => {
            store[ref.collection] ??= {};
            store[ref.collection][ref.id] = data;
            writes.sets.push({ collection: ref.collection, id: ref.id, data });
          },
        };
        result = await fn(tx);
      });
      await transactionChain;
      return result;
    },
  };

  return { db: db as never, store, writes };
}

function importParams(
  db: CatalogImportWriteParams["db"],
  overrides: Partial<CatalogImportWriteParams> = {},
): CatalogImportWriteParams {
  return {
    db,
    ctx: staffCtx("gym-a", "OWNER"),
    gymId: "gym-a",
    catalogId: "dev-push-up",
    newExerciseId: "ex-new",
    ...overrides,
  };
}

describe("pickCanonicalCatalogExercise", () => {
  it("chooses the oldest exercise and breaks ties by document id", () => {
    const older = catalogExercise("ex-old", {
      createdAt: Timestamp.fromDate(new Date("2026-01-01T00:00:00Z")),
    });
    const newer = catalogExercise("ex-new", {
      createdAt: Timestamp.fromDate(new Date("2026-06-01T00:00:00Z")),
    });

    expect(
      pickCanonicalCatalogExercise([
        { id: "ex-new", doc: newer },
        { id: "ex-old", doc: older },
      ]).id,
    ).toBe("ex-old");
  });
});

describe("importCatalogExerciseInTransaction idempotency", () => {
  it("returns already_imported and backfills lock when matching exercise exists without lock", async () => {
    const { db, store, writes } = createMockImportDb({
      catalog: catalogDoc(),
      exercises: {
        "ex-legacy": catalogExercise("ex-legacy"),
      },
    });

    const result = await importCatalogExerciseInTransaction(
      importParams(db, { newExerciseId: "ex-new" }),
    );

    expect(result).toEqual({
      catalogId: "dev-push-up",
      status: "already_imported",
      exerciseId: "ex-legacy",
    });
    expect(
      store[COLLECTIONS.catalogImportLocks]?.[
        catalogImportLockDocId("gym-a", "dev-push-up")
      ],
    ).toMatchObject({
      gymId: "gym-a",
      catalogId: "dev-push-up",
      exerciseId: "ex-legacy",
    });
    expect(writes.sets).toHaveLength(1);
    expect(store[COLLECTIONS.customExercises]?.["ex-new"]).toBeUndefined();
  });

  it("imports when no lock and no existing exercise", async () => {
    const { db, store } = createMockImportDb({ catalog: catalogDoc() });

    const result = await importCatalogExerciseInTransaction(importParams(db));

    expect(result.status).toBe("imported");
    expect(result.exerciseId).toBe("ex-new");
    expect(store[COLLECTIONS.customExercises]?.["ex-new"]).toBeDefined();
  });

  it("returns already_imported for a valid lock and matching exercise", async () => {
    const { db, writes } = createMockImportDb({
      catalog: catalogDoc(),
      lock: { gymId: "gym-a", catalogId: "dev-push-up", exerciseId: "ex-existing" },
      exercises: {
        "ex-existing": catalogExercise("ex-existing"),
      },
    });

    const result = await importCatalogExerciseInTransaction(
      importParams(db, { newExerciseId: "ex-new" }),
    );

    expect(result).toEqual({
      catalogId: "dev-push-up",
      status: "already_imported",
      exerciseId: "ex-existing",
    });
    expect(writes.sets).toHaveLength(0);
  });

  it("imports when lock points to a missing exercise", async () => {
    const { db, store } = createMockImportDb({
      catalog: catalogDoc(),
      lock: { gymId: "gym-a", catalogId: "dev-push-up", exerciseId: "missing-ex" },
    });

    const result = await importCatalogExerciseInTransaction(
      importParams(db, { newExerciseId: "ex-new" }),
    );

    expect(result).toEqual({
      catalogId: "dev-push-up",
      status: "imported",
      exerciseId: "ex-new",
    });
    expect(
      store[COLLECTIONS.catalogImportLocks]?.[
        catalogImportLockDocId("gym-a", "dev-push-up")
      ],
    ).toMatchObject({ exerciseId: "ex-new" });
  });

  it("does not treat a lock pointing at another gym as already imported", async () => {
    const { db, store } = createMockImportDb({
      catalog: catalogDoc(),
      lock: { gymId: "gym-a", catalogId: "dev-push-up", exerciseId: "ex-other-gym" },
      exercises: {
        "ex-other-gym": catalogExercise("ex-other-gym", { gymId: "gym-b" }),
      },
    });

    const result = await importCatalogExerciseInTransaction(
      importParams(db, { newExerciseId: "ex-new" }),
    );

    expect(result.status).toBe("imported");
    expect(result.exerciseId).toBe("ex-new");
    expect(store[COLLECTIONS.customExercises]?.["ex-other-gym"]).toBeDefined();
  });

  it("repairs a lock pointing at an exercise with the wrong catalogId", async () => {
    const { db, store } = createMockImportDb({
      catalog: catalogDoc(),
      lock: { gymId: "gym-a", catalogId: "dev-push-up", exerciseId: "ex-wrong" },
      exercises: {
        "ex-wrong": catalogExercise("ex-wrong", { catalogId: "dev-other" }),
        "ex-correct": catalogExercise("ex-correct"),
      },
    });

    const result = await importCatalogExerciseInTransaction(
      importParams(db, { newExerciseId: "ex-new" }),
    );

    expect(result).toEqual({
      catalogId: "dev-push-up",
      status: "already_imported",
      exerciseId: "ex-correct",
    });
    expect(
      store[COLLECTIONS.catalogImportLocks]?.[
        catalogImportLockDocId("gym-a", "dev-push-up")
      ],
    ).toMatchObject({ exerciseId: "ex-correct" });
    expect(store[COLLECTIONS.customExercises]?.["ex-new"]).toBeUndefined();
  });

  it("treats a lock pointing at an exercise missing catalogId as stale", async () => {
    const { db, store } = createMockImportDb({
      catalog: catalogDoc(),
      lock: { gymId: "gym-a", catalogId: "dev-push-up", exerciseId: "ex-no-catalog" },
      exercises: {
        "ex-no-catalog": catalogExercise("ex-no-catalog", {
          catalogId: null,
          exerciseSource: "CUSTOM",
        }),
      },
    });

    const result = await importCatalogExerciseInTransaction(
      importParams(db, { newExerciseId: "ex-new" }),
    );

    expect(result.status).toBe("imported");
    expect(result.exerciseId).toBe("ex-new");
    expect(isValidCatalogImportExercise(
      store[COLLECTIONS.customExercises]?.["ex-no-catalog"] as CustomExerciseDoc,
      "gym-a",
      "dev-push-up",
    )).toBe(false);
  });

  it("handles multiple legacy duplicates deterministically without deleting data", async () => {
    const { db, store } = createMockImportDb({
      catalog: catalogDoc(),
      exercises: {
        "ex-newer": catalogExercise("ex-newer", {
          createdAt: Timestamp.fromDate(new Date("2026-06-01T00:00:00Z")),
        }),
        "ex-older": catalogExercise("ex-older", {
          createdAt: Timestamp.fromDate(new Date("2026-01-01T00:00:00Z")),
        }),
      },
    });

    const result = await importCatalogExerciseInTransaction(
      importParams(db, { newExerciseId: "ex-brand-new" }),
    );

    expect(result).toEqual({
      catalogId: "dev-push-up",
      status: "already_imported",
      exerciseId: "ex-older",
    });
    expect(store[COLLECTIONS.customExercises]?.["ex-newer"]).toBeDefined();
    expect(store[COLLECTIONS.customExercises]?.["ex-older"]).toBeDefined();
    expect(store[COLLECTIONS.customExercises]?.["ex-brand-new"]).toBeUndefined();
  });

  it("serializes repeated import attempts through the transaction", async () => {
    const { db } = createMockImportDb({ catalog: catalogDoc() });
    const params = importParams(db, { newExerciseId: "ex-first" });

    const [first, second] = await Promise.all([
      importCatalogExerciseInTransaction({ ...params, newExerciseId: "ex-first" }),
      importCatalogExerciseInTransaction({ ...params, newExerciseId: "ex-second" }),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual(["already_imported", "imported"]);
  });

  it("never matches catalog exercises from another gym during backfill", async () => {
    const { db, store } = createMockImportDb({
      catalog: catalogDoc(),
      exercises: {
        "ex-gym-b": catalogExercise("ex-gym-b", { gymId: "gym-b" }),
      },
    });

    const result = await importCatalogExerciseInTransaction(importParams(db));

    expect(result.status).toBe("imported");
    expect(result.exerciseId).toBe("ex-new");
    expect(store[COLLECTIONS.customExercises]?.["ex-gym-b"]).toBeDefined();
  });

  it("rejects tenant mismatch before opening a transaction", async () => {
    const { db } = createMockImportDb({ catalog: catalogDoc() });

    await expect(
      importCatalogExerciseInTransaction({
        ...importParams(db),
        ctx: staffCtx("gym-a", "OWNER"),
        gymId: "gym-b",
      }),
    ).rejects.toThrow("Tenant isolation violation");
  });
});
