import { Timestamp } from "firebase-admin/firestore";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { browseExerciseCatalog } from "@/lib/catalog/catalog-browse";
import { toCatalogBrowseItem } from "@/lib/catalog/catalog-browse-types";
import {
  buildImportedCustomExerciseDoc,
  catalogImportLockDocId,
  importCatalogExerciseInTransaction,
  importCatalogExercisesForGym,
  type CatalogImportWriteParams,
} from "@/lib/catalog/catalog-import";
import { COLLECTIONS } from "@/lib/firestore/collections";
import type { StaffContext } from "@/lib/firestore/context";
import { platformContext } from "@/lib/firestore/helpers";
import type { FirestoreRepositories } from "@/lib/firestore/repositories";
import { CustomExercisesRepository } from "@/lib/firestore/repositories/custom-exercises";
import type { DocWithId } from "@/lib/firestore/repositories/base";
import type { CustomExerciseDoc, ExerciseCatalogDoc } from "@/lib/firestore/types";
import {
  canBrowseExerciseCatalog,
  canImportExerciseCatalog,
} from "@/lib/permissions";
import { resolveExerciseSource } from "@/lib/exercises/source";

const PUBLIC_BASE =
  "https://example.supabase.co/storage/v1/object/public/gym-assets";

beforeEach(() => {
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_STORAGE_BUCKET = "gym-assets";
});

afterEach(() => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_STORAGE_BUCKET;
});

function catalogRepos(
  exerciseCatalog: Pick<FirestoreRepositories["exerciseCatalog"], "listPage" | "searchByPrefix">,
  customExercises: Pick<
    FirestoreRepositories["customExercises"],
    "findImportedCatalogIds"
  >,
): Pick<FirestoreRepositories, "exerciseCatalog" | "customExercises"> {
  return {
    exerciseCatalog: exerciseCatalog as FirestoreRepositories["exerciseCatalog"],
    customExercises: customExercises as FirestoreRepositories["customExercises"],
  };
}

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
    const lockId = `${initial.lock.gymId}_${initial.lock.catalogId}`;
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
    creates: [] as Array<{ collection: string; id: string; data: unknown }>,
    sets: [] as Array<{ collection: string; id: string; data: unknown }>,
    deletes: [] as Array<{ collection: string; id: string }>,
  };

  let transactionChain = Promise.resolve();

  function docRef(collection: string, id: string) {
    return {
      collection,
      id,
      get: async () => {
        const data = store[collection]?.[id];
        return {
          exists: data !== undefined,
          data: () => data,
        };
      },
      delete: async () => {
        if (store[collection]?.[id] !== undefined) {
          delete store[collection]![id];
          writes.deletes.push({ collection, id });
        }
      },
    };
  }

  type QueryFilter = { field: string; op: string; value: unknown };

  function buildQuery(collection: string, filters: QueryFilter[]) {
    return {
      collection,
      filters,
      get: async () => {
        const entries = Object.entries(store[collection] ?? {});
        const docs = entries
          .filter(([, data]) =>
            filters.every((filter) => {
              if (filter.op !== "==") return false;
              return (data as Record<string, unknown>)[filter.field] === filter.value;
            }),
          )
          .map(([id, data]) => ({
            id,
            data: () => data,
          }));
        return {
          exists: false,
          data: () => undefined,
          docs,
          empty: docs.length === 0,
        };
      },
    };
  }

  function makeQuery(collection: string, filters: QueryFilter[]) {
    return {
      collection,
      filters,
      where: (nextField: string, nextOp: string, nextValue: unknown) =>
        makeQuery(collection, [
          ...filters,
          { field: nextField, op: nextOp, value: nextValue },
        ]),
      get: () => buildQuery(collection, filters).get(),
    };
  }

  function collectionRef(name: string) {
    return {
      doc: (id: string) => docRef(name, id),
      where: (field: string, op: string, value: unknown) =>
        makeQuery(name, [{ field, op, value }]),
    };
  }

  const db = {
    collection: (name: string) => collectionRef(name),
    runTransaction: async <T>(fn: (tx: {
      get: (ref: { collection: string; id?: string; filters?: QueryFilter[] }) => Promise<{ exists: boolean; data: () => unknown; docs?: Array<{ id: string; data: () => unknown }>; empty?: boolean }>;
      create: (ref: { collection: string; id: string }, data: unknown) => void;
      set: (ref: { collection: string; id: string }, data: unknown) => void;
      delete: (ref: { collection: string; id: string }) => void;
    }) => Promise<T>) => {
      let result!: T;
      transactionChain = transactionChain.then(async () => {
        const tx = {
          get: async (ref: { collection: string; id?: string; filters?: QueryFilter[] }) => {
            if (ref.filters) {
              return buildQuery(ref.collection, ref.filters).get();
            }
            const data = store[ref.collection]?.[ref.id!];
            return {
              exists: data !== undefined,
              data: () => data,
            };
          },
          create: (ref: { collection: string; id: string }, data: unknown) => {
            if (store[ref.collection]?.[ref.id] !== undefined) {
              throw new Error("Document already exists");
            }
            store[ref.collection] ??= {};
            store[ref.collection][ref.id] = data;
            writes.creates.push({ collection: ref.collection, id: ref.id, data });
          },
          set: (ref: { collection: string; id: string }, data: unknown) => {
            store[ref.collection] ??= {};
            store[ref.collection][ref.id] = data;
            writes.sets.push({ collection: ref.collection, id: ref.id, data });
          },
          delete: (ref: { collection: string; id: string }) => {
            if (store[ref.collection]?.[ref.id] !== undefined) {
              delete store[ref.collection]![ref.id];
              writes.deletes.push({ collection: ref.collection, id: ref.id });
            }
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

function staffCtx(gymId: string, role: StaffContext["role"]): StaffContext {
  return { kind: "staff", userId: "user-1", gymId, role };
}

function catalogDoc(
  overrides: Partial<ExerciseCatalogDoc> = {},
): DocWithId<ExerciseCatalogDoc> {
  const now = Timestamp.fromDate(new Date("2026-09-20T00:00:00Z"));
  const catalogId = overrides.catalogId ?? "dev-push-up";
  return {
    id: catalogId,
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
      providerExerciseId: "dev-push-up",
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

describe("catalog permissions", () => {
  it("allows owner, admin, and staff to browse", () => {
    expect(canBrowseExerciseCatalog("OWNER")).toBe(true);
    expect(canBrowseExerciseCatalog("ADMIN")).toBe(true);
    expect(canBrowseExerciseCatalog("STAFF")).toBe(true);
  });

  it("allows owner and admin to import but not staff or members", () => {
    expect(canImportExerciseCatalog("OWNER")).toBe(true);
    expect(canImportExerciseCatalog("ADMIN")).toBe(true);
    expect(canImportExerciseCatalog("STAFF")).toBe(false);
    expect(canImportExerciseCatalog("MEMBER" as never)).toBe(false);
  });

  it("denies members from browsing the catalog", () => {
    expect(canBrowseExerciseCatalog("MEMBER" as never)).toBe(false);
  });
});

describe("browseExerciseCatalog", () => {
  it("returns safe catalog fields and imported flags without gym-private data", async () => {
    const exerciseCatalog = {
      listPage: vi.fn().mockResolvedValue({
        items: [catalogDoc()],
        nextCursor: null,
        hasMore: false,
      }),
      searchByPrefix: vi.fn(),
    };
    const customExercises = {
      findImportedCatalogIds: vi.fn().mockResolvedValue(new Set(["dev-push-up"])),
    };

    const page = await browseExerciseCatalog({
      ctx: staffCtx("gym-a", "STAFF"),
      repos: catalogRepos(exerciseCatalog, customExercises),
    });

    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toEqual({
      catalogId: "dev-push-up",
      name: "Push Up",
      muscleGroup: "CHEST",
      description: "Bodyweight push.",
      equipment: null,
      difficulty: "beginner",
      primaryMuscles: ["pectorals"],
      isBodyweight: true,
      hasMedia: false,
      media: {
        primaryImageUrl: null,
        secondaryImageUrl: null,
        thumbnailUrl: null,
        animationUrl: null,
        videoUrl: null,
      },
      catalogVersion: "dev-fixture-v1",
      alreadyImported: true,
    });
    expect(page.items[0]).not.toHaveProperty("gymId");
    expect(exerciseCatalog.listPage).toHaveBeenCalledOnce();
  });

  it("uses prefix search when query is provided", async () => {
    const exerciseCatalog = {
      listPage: vi.fn(),
      searchByPrefix: vi.fn().mockResolvedValue({
        items: [catalogDoc()],
        nextCursor: null,
        hasMore: false,
      }),
    };
    const customExercises = {
      findImportedCatalogIds: vi.fn().mockResolvedValue(new Set()),
    };

    await browseExerciseCatalog({
      ctx: staffCtx("gym-a", "OWNER"),
      repos: catalogRepos(exerciseCatalog, customExercises),
      input: { query: "push", muscleGroup: "CHEST" },
    });

    expect(exerciseCatalog.searchByPrefix).toHaveBeenCalledWith(
      staffCtx("gym-a", "OWNER"),
      expect.objectContaining({
        query: "push",
        muscleGroup: "CHEST",
        startAfterId: null,
      }),
    );
    expect(exerciseCatalog.listPage).not.toHaveBeenCalled();
  });
});

describe("buildImportedCustomExerciseDoc", () => {
  it("creates gym-specific catalog exercises with defaults and metadata copied", () => {
    const now = Timestamp.fromDate(new Date("2026-09-20T00:00:00Z"));
    const doc = buildImportedCustomExerciseDoc("gym-a", catalogDoc(), {
      createdAt: now,
      updatedAt: now,
    });

    expect(doc.gymId).toBe("gym-a");
    expect(doc.exerciseSource).toBe("CATALOG");
    expect(doc.catalogId).toBe("dev-push-up");
    expect(doc.importedCatalogVersion).toBe("dev-fixture-v1");
    expect(doc.defaultSets).toBeNull();
    expect(doc.isSeeded).toBe(false);
    expect(doc.media).toEqual(catalogDoc().media);
    expect(doc.provider).toEqual(catalogDoc().provider);
  });

  it("keeps legacy seeded/custom compatibility helpers unchanged", () => {
    expect(resolveExerciseSource({ isSeeded: true })).toBe("SEEDED");
    expect(resolveExerciseSource({ isSeeded: false, exerciseSource: "CATALOG" })).toBe(
      "CATALOG",
    );
  });
});

describe("importCatalogExercisesForGym", () => {
  it("returns mixed import results", async () => {
    const writeItem = vi
      .fn()
      .mockResolvedValueOnce({
        catalogId: "dev-push-up",
        status: "imported",
        exerciseId: "ex-1",
      })
      .mockResolvedValueOnce({
        catalogId: "dev-retired",
        status: "already_imported",
        exerciseId: "ex-old",
      })
      .mockResolvedValueOnce({
        catalogId: "missing",
        status: "unavailable",
        reason: "Catalog exercise not found.",
      })
      .mockResolvedValueOnce({
        catalogId: "bad id",
        status: "invalid",
        reason: "catalogId format is invalid.",
      });

    const result = await importCatalogExercisesForGym({
      db: {} as never,
      ctx: staffCtx("gym-a", "OWNER"),
      gymId: "gym-a",
      catalogIds: ["dev-push-up", "dev-retired", "missing", "bad id"],
      writeItem,
    });

    expect(result.summary).toEqual({
      imported: 1,
      alreadyImported: 1,
      unavailable: 1,
      invalid: 1,
    });
  });

  it("is idempotent when re-importing the same catalogId", async () => {
    const locks = new Map<string, string>();
    const writeItem = async (params: CatalogImportWriteParams) => {
      const key = `${params.gymId}_${params.catalogId}`;
      if (locks.has(key)) {
        return {
          catalogId: params.catalogId,
          status: "already_imported" as const,
          exerciseId: locks.get(key),
        };
      }
      locks.set(key, params.newExerciseId);
      return {
        catalogId: params.catalogId,
        status: "imported" as const,
        exerciseId: params.newExerciseId,
      };
    };

    const first = await importCatalogExercisesForGym({
      db: {} as never,
      ctx: staffCtx("gym-a", "ADMIN"),
      gymId: "gym-a",
      catalogIds: ["dev-push-up"],
      writeItem,
    });
    const second = await importCatalogExercisesForGym({
      db: {} as never,
      ctx: staffCtx("gym-a", "ADMIN"),
      gymId: "gym-a",
      catalogIds: ["dev-push-up"],
      writeItem,
    });

    expect(first.summary.imported).toBe(1);
    expect(second.summary.alreadyImported).toBe(1);
    expect(second.summary.imported).toBe(0);
  });

  it("prevents duplicate imports via lock document", async () => {
    const { db } = createMockImportDb({ catalog: catalogDoc() });

    const first = await importCatalogExerciseInTransaction({
      db,
      ctx: staffCtx("gym-a", "OWNER"),
      gymId: "gym-a",
      catalogId: "dev-push-up",
      newExerciseId: "ex-first",
    });
    const second = await importCatalogExerciseInTransaction({
      db,
      ctx: staffCtx("gym-a", "OWNER"),
      gymId: "gym-a",
      catalogId: "dev-push-up",
      newExerciseId: "ex-second",
    });

    expect(first.status).toBe("imported");
    expect(second).toEqual({
      catalogId: "dev-push-up",
      status: "already_imported",
      exerciseId: "ex-first",
    });
  });

  it("serializes concurrent import attempts through the lock transaction", async () => {
    const { db } = createMockImportDb({ catalog: catalogDoc() });
    const params = {
      db,
      ctx: staffCtx("gym-a", "OWNER"),
      gymId: "gym-a",
      catalogId: "dev-push-up",
    };

    const [first, second] = await Promise.all([
      importCatalogExerciseInTransaction({ ...params, newExerciseId: "ex-first" }),
      importCatalogExerciseInTransaction({ ...params, newExerciseId: "ex-second" }),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual(["already_imported", "imported"]);
  });

  it("re-imports after deleting a catalog-linked exercise and removing its lock", async () => {
    const { db, store } = createMockImportDb({ catalog: catalogDoc() });
    const repo = new CustomExercisesRepository(db);

    const first = await importCatalogExerciseInTransaction({
      db,
      ctx: staffCtx("gym-a", "OWNER"),
      gymId: "gym-a",
      catalogId: "dev-push-up",
      newExerciseId: "ex-first",
    });
    expect(first.status).toBe("imported");

    const deleted = await repo.deleteCustomExercise(platformContext, "gym-a", "ex-first");
    expect(deleted).toBe(true);
    expect(store[COLLECTIONS.customExercises]?.["ex-first"]).toBeUndefined();
    expect(
      store[COLLECTIONS.catalogImportLocks]?.[catalogImportLockDocId("gym-a", "dev-push-up")],
    ).toBeUndefined();

    const second = await importCatalogExerciseInTransaction({
      db,
      ctx: staffCtx("gym-a", "OWNER"),
      gymId: "gym-a",
      catalogId: "dev-push-up",
      newExerciseId: "ex-second",
    });
    expect(second).toEqual({
      catalogId: "dev-push-up",
      status: "imported",
      exerciseId: "ex-second",
    });
  });

  it("replaces a stale lock when the referenced exercise no longer exists", async () => {
    const { db } = createMockImportDb({
      catalog: catalogDoc(),
      lock: { gymId: "gym-a", catalogId: "dev-push-up", exerciseId: "missing-ex" },
    });

    const result = await importCatalogExerciseInTransaction({
      db,
      ctx: staffCtx("gym-a", "OWNER"),
      gymId: "gym-a",
      catalogId: "dev-push-up",
      newExerciseId: "ex-new",
    });

    expect(result).toEqual({
      catalogId: "dev-push-up",
      status: "imported",
      exerciseId: "ex-new",
    });
  });

  it("rejects tenant mismatch between staff context and target gym", async () => {
    await expect(
      importCatalogExercisesForGym({
        db: {} as never,
        ctx: staffCtx("gym-a", "OWNER"),
        gymId: "gym-b",
        catalogIds: ["dev-push-up"],
        writeItem: async () => ({
          catalogId: "dev-push-up",
          status: "imported",
          exerciseId: "ex-1",
        }),
      }),
    ).rejects.toThrow("Tenant isolation violation");
  });

  it("does not expose another gym's data through browse mapping", () => {
    const item = toCatalogBrowseItem(catalogDoc(), new Set());
    expect(item).not.toHaveProperty("gymId");
    expect(item.catalogId).toBe("dev-push-up");
  });

  it("includes catalog-scoped media metadata for browse previews", () => {
    const item = toCatalogBrowseItem(
      catalogDoc({
        media: {
          primaryImageUrl:
            `${PUBLIC_BASE}/catalog/dev-push-up/primary.webp`,
          secondaryImageUrl: null,
          thumbnailUrl: null,
        },
      }),
      new Set(),
    );

    expect(item.hasMedia).toBe(true);
    expect(item.media?.primaryImageUrl).toContain("/catalog/dev-push-up/");
  });
});

describe("importCatalogExerciseInTransaction", () => {
  it("imports an active catalog exercise with lock and gym document fields", async () => {
    const source = catalogDoc();
    const { db, writes } = createMockImportDb({ catalog: source });

    const result = await importCatalogExerciseInTransaction({
      db,
      ctx: staffCtx("gym-a", "OWNER"),
      gymId: "gym-a",
      catalogId: "dev-push-up",
      newExerciseId: "ex-new",
    });

    expect(result).toEqual({
      catalogId: "dev-push-up",
      status: "imported",
      exerciseId: "ex-new",
    });
    expect(writes.creates).toHaveLength(0);
    expect(writes.sets).toHaveLength(2);
    const exerciseWrite = writes.sets.find(
      (entry) =>
        entry.collection === COLLECTIONS.customExercises && entry.id === "ex-new",
    );
    expect(exerciseWrite?.data).toMatchObject({
      gymId: "gym-a",
      exerciseSource: "CATALOG",
      catalogId: "dev-push-up",
      importedCatalogVersion: "dev-fixture-v1",
      defaultSets: null,
      defaultReps: null,
    });
  });

  it("returns already_imported when lock exists without creating duplicates", async () => {
    const now = Timestamp.fromDate(new Date("2026-09-20T00:00:00Z"));
    const { db, writes } = createMockImportDb({
      lock: { gymId: "gym-a", catalogId: "dev-push-up", exerciseId: "ex-existing" },
      catalog: catalogDoc(),
      exercises: {
        "ex-existing": {
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
        },
      },
    });

    const result = await importCatalogExerciseInTransaction({
      db,
      ctx: staffCtx("gym-a", "ADMIN"),
      gymId: "gym-a",
      catalogId: "dev-push-up",
      newExerciseId: "ex-new",
    });

    expect(result).toEqual({
      catalogId: "dev-push-up",
      status: "already_imported",
      exerciseId: "ex-existing",
    });
    expect(writes.creates).toHaveLength(0);
    expect(writes.sets).toHaveLength(0);
  });

  it("rejects invalid catalog IDs before touching Firestore", async () => {
    const { db } = createMockImportDb({});

    const result = await importCatalogExerciseInTransaction({
      db,
      ctx: staffCtx("gym-a", "OWNER"),
      gymId: "gym-a",
      catalogId: "bad id",
      newExerciseId: "ex-new",
    });

    expect(result.status).toBe("invalid");
  });

  it("returns unavailable for missing or inactive catalog exercises", async () => {
    const missingDb = createMockImportDb({}).db;
    const missing = await importCatalogExerciseInTransaction({
      db: missingDb,
      ctx: staffCtx("gym-a", "OWNER"),
      gymId: "gym-a",
      catalogId: "dev-missing",
      newExerciseId: "ex-new",
    });
    expect(missing.status).toBe("unavailable");

    const inactiveDb = createMockImportDb({
      catalog: catalogDoc({ catalogId: "dev-inactive", isActive: false }),
    }).db;
    const inactive = await importCatalogExerciseInTransaction({
      db: inactiveDb,
      ctx: staffCtx("gym-a", "OWNER"),
      gymId: "gym-a",
      catalogId: "dev-inactive",
      newExerciseId: "ex-new",
    });
    expect(inactive).toMatchObject({
      catalogId: "dev-inactive",
      status: "unavailable",
      reason: "Catalog exercise is inactive.",
    });
  });
});
