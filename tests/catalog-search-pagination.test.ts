import { describe, expect, it, vi } from "vitest";

import { browseExerciseCatalog } from "@/lib/catalog/catalog-browse";
import {
  compareCatalogDocs,
  decodeCatalogSearchCursor,
  encodeCatalogSearchCursor,
  paginateMergedCatalogSearch,
} from "@/lib/catalog/catalog-search-pagination";
import { buildCatalogSearchPrefixes } from "@/lib/exercises/catalog-search";
import { InvalidPaginationCursorError } from "@/lib/firestore/errors";
import type { StaffContext } from "@/lib/firestore/context";
import type { FirestoreRepositories } from "@/lib/firestore/repositories";
import { ExerciseCatalogRepository } from "@/lib/firestore/repositories/exercise-catalog";
import type { ExerciseCatalogDoc, MuscleGroup } from "@/lib/firestore/types";

function ts() {
  return { toDate: () => new Date("2026-09-20T00:00:00Z") };
}

function validCatalogInput(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const catalogId = (overrides.catalogId as string | undefined) ?? "bench-press";
  const name = (overrides.name as string | undefined) ?? "Bench Press";
  const nameLower =
    (overrides.nameLower as string | undefined) ?? String(name).toLowerCase();

  return {
    catalogId,
    name,
    nameLower,
    muscleGroup: "CHEST",
    description: "Compound chest press.",
    instructions: ["Lie on the bench.", "Press the bar up."],
    tips: null,
    equipment: "barbell",
    bodyPart: "chest",
    difficulty: "intermediate",
    movementPattern: "push",
    primaryMuscles: ["pectorals"],
    secondaryMuscles: ["triceps"],
    safetyNotes: null,
    category: "strength",
    isBodyweight: false,
    media: {
      primaryImageUrl: null,
      secondaryImageUrl: null,
      thumbnailUrl: null,
    },
    provider: {
      provider: "repdb",
      providerExerciseId: catalogId,
      attributionText: null,
      attributionUrl: null,
      licenseTier: "free",
    },
    catalogVersion: "test-v1",
    searchPrefixes: buildCatalogSearchPrefixes(String(name)),
    isActive: true,
    createdAt: ts(),
    updatedAt: ts(),
    ...overrides,
  };
}

function staffCtx(gymId: string): StaffContext {
  return {
    kind: "staff",
    userId: "staff-1",
    gymId,
    role: "OWNER",
  };
}

type StoredCatalogDoc = Record<string, unknown> & {
  catalogId: string;
  nameLower: string;
  isActive: boolean;
  muscleGroup: MuscleGroup;
  searchPrefixes: string[];
};

function compareStoredDocs(a: StoredCatalogDoc, b: StoredCatalogDoc): number {
  const byName = a.nameLower.localeCompare(b.nameLower);
  return byName !== 0 ? byName : a.catalogId.localeCompare(b.catalogId);
}

function matchesNameRange(doc: StoredCatalogDoc, token: string, prefixEnd: string) {
  return doc.nameLower >= token && doc.nameLower < prefixEnd;
}

function matchesPrefixQuery(doc: StoredCatalogDoc, token: string) {
  return doc.searchPrefixes.includes(token);
}

function buildDualStreamCatalogMock(initialDocs: StoredCatalogDoc[]) {
  const store = new Map<string, StoredCatalogDoc>();
  for (const doc of initialDocs) {
    store.set(doc.catalogId, doc);
  }

  function sortedDocs(
    predicate: (doc: StoredCatalogDoc) => boolean,
    muscleGroup: MuscleGroup | null,
  ) {
    return [...store.values()]
      .filter((doc) => doc.isActive)
      .filter((doc) => (muscleGroup ? doc.muscleGroup === muscleGroup : true))
      .filter(predicate)
      .sort(compareStoredDocs);
  }

  function sliceAfter<T extends { catalogId: string }>(
    docs: T[],
    startAfterId: string | null,
    limit: number,
  ) {
    let startIndex = 0;
    if (startAfterId) {
      const index = docs.findIndex((doc) => doc.catalogId === startAfterId);
      startIndex = index >= 0 ? index + 1 : docs.length;
    }
    return docs.slice(startIndex, startIndex + limit);
  }

  const queryResult = {
    startAfter: vi.fn(),
    limit: vi.fn(),
    orderBy: vi.fn(),
    where: vi.fn(),
    get: vi.fn(),
  };
  queryResult.startAfter.mockReturnValue(queryResult);
  queryResult.limit.mockReturnValue(queryResult);
  queryResult.orderBy.mockReturnValue(queryResult);

  queryResult.where.mockImplementation((field: string, op: string, value: unknown) => {
    const filters: Array<{ field: string; op: string; value: unknown }> = [
      { field, op, value },
    ];
    const chain: {
      where: typeof chainWhere;
      orderBy: () => typeof chain;
      startAfter: (cursor: { id: string } | null) => typeof chain;
      limit: (limit: number) => typeof chain;
      get: () => Promise<{ docs: Array<{ id: string; data: () => StoredCatalogDoc }> }>;
      __cursor: string | null;
      __limit: number;
    } = {
      where: chainWhere,
      orderBy: () => chain,
      startAfter: (cursor: { id: string } | null) => {
        chain.__cursor = cursor?.id ?? null;
        return chain;
      },
      limit: (limit: number) => {
        chain.__limit = limit;
        return chain;
      },
      get: async () => {
        let muscleGroup: MuscleGroup | null = null;
        let token = "";
        let prefixEnd = "";
        let mode: "name" | "prefix" | null = null;

        for (const filter of filters) {
          if (filter.field === "muscleGroup" && filter.op === "==") {
            muscleGroup = filter.value as MuscleGroup;
          }
          if (filter.field === "nameLower" && filter.op === ">=") {
            mode = "name";
            token = String(filter.value);
          }
          if (filter.field === "nameLower" && filter.op === "<") {
            prefixEnd = String(filter.value);
          }
          if (filter.field === "searchPrefixes" && filter.op === "array-contains") {
            mode = "prefix";
            token = String(filter.value);
          }
        }

        const predicate =
          mode === "name"
            ? (doc: StoredCatalogDoc) => matchesNameRange(doc, token, prefixEnd)
            : mode === "prefix"
              ? (doc: StoredCatalogDoc) => matchesPrefixQuery(doc, token)
              : () => false;

        const docs = sliceAfter(
          sortedDocs(predicate, muscleGroup),
          chain.__cursor ?? null,
          chain.__limit ?? 30,
        ).map((doc) => ({
          id: doc.catalogId,
          data: () => doc,
        }));

        return { docs };
      },
      __cursor: null,
      __limit: 30,
    };

    function chainWhere(nextField: string, nextOp: string, nextValue: unknown) {
      filters.push({ field: nextField, op: nextOp, value: nextValue });
      return chain;
    }

    return chain;
  });

  const db = {
    collection: vi.fn(() => ({
      where: queryResult.where,
      doc: vi.fn((id: string) => ({
        get: vi.fn(async () => {
          const data = store.get(id);
          return {
            exists: data !== undefined,
            id,
            data: () => data,
          };
        }),
      })),
    })),
  };

  return { db: db as never, store, queryResult };
}

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

async function collectSearchPages(
  repo: ExerciseCatalogRepository,
  query: string,
  options: { limit?: number; muscleGroup?: MuscleGroup | null } = {},
) {
  const ids: string[] = [];
  let cursor: string | null = null;
  let pageCount = 0;

  while (pageCount < 20) {
    const page = await repo.searchByPrefix(staffCtx("gym-a"), {
      query,
      limit: options.limit ?? 2,
      muscleGroup: options.muscleGroup ?? null,
      startAfterId: cursor,
    });
    ids.push(...page.items.map((item) => item.id));
    cursor = page.nextCursor;
    pageCount += 1;
    if (!page.hasMore || !page.nextCursor) break;
  }

  return { ids, pageCount };
}

describe("catalog search cursor encoding", () => {
  it("rejects cursors reused with a different search query", () => {
    const cursor = encodeCatalogSearchCursor({
      v: 1,
      token: "push",
      muscleGroup: null,
      boundaryNameLower: "push up",
      boundaryId: "dev-push-up",
      nameAfterId: "dev-push-up",
      prefixAfterId: null,
    });

    expect(() =>
      decodeCatalogSearchCursor(cursor, { query: "pull", muscleGroup: null }),
    ).toThrow(InvalidPaginationCursorError);
  });

  it("rejects cursors reused with a different muscle-group filter", () => {
    const cursor = encodeCatalogSearchCursor({
      v: 1,
      token: "press",
      muscleGroup: "CHEST",
      boundaryNameLower: "chest press",
      boundaryId: "chest-press",
      nameAfterId: "chest-press",
      prefixAfterId: null,
    });

    expect(() =>
      decodeCatalogSearchCursor(cursor, {
        query: "press",
        muscleGroup: "LEGS",
      }),
    ).toThrow(InvalidPaginationCursorError);
  });

  it("rejects malformed cursors", () => {
    expect(() =>
      decodeCatalogSearchCursor("../bad", { query: "press", muscleGroup: null }),
    ).toThrow(InvalidPaginationCursorError);
  });
});

describe("ExerciseCatalogRepository.searchByPrefix merged pagination", () => {
  it("returns empty results for blank search input", async () => {
    const { db } = buildDualStreamCatalogMock([]);
    const repo = new ExerciseCatalogRepository(db);
    const page = await repo.searchByPrefix(staffCtx("gym-a"), { query: "   " });
    expect(page.items).toEqual([]);
    expect(page.hasMore).toBe(false);
  });

  it("includes name-only and prefix-only matches across pages without skipping rows", async () => {
    const { db } = buildDualStreamCatalogMock([
      validCatalogInput({
        catalogId: "alpha-bench",
        name: "Alpha Bench",
        nameLower: "alpha bench",
      }) as StoredCatalogDoc,
      validCatalogInput({
        catalogId: "beta-bench",
        name: "Beta Bench",
        nameLower: "beta bench",
      }) as StoredCatalogDoc,
      validCatalogInput({
        catalogId: "hidden-token",
        name: "Token Bencher",
        nameLower: "token bencher",
        searchPrefixes: ["bench", "ben"],
      }) as StoredCatalogDoc,
    ]);

    const repo = new ExerciseCatalogRepository(db);
    const { ids } = await collectSearchPages(repo, "bench", { limit: 2 });

    expect(ids).toEqual(["alpha-bench", "beta-bench", "hidden-token"]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("deduplicates overlapping rows and paginates past overlap at page boundaries", async () => {
    const { db } = buildDualStreamCatalogMock([
      validCatalogInput({
        catalogId: "aaa-row",
        name: "Shared Prefix A",
        nameLower: "shared prefix a",
      }) as StoredCatalogDoc,
      validCatalogInput({
        catalogId: "bbb-row",
        name: "Shared Prefix B",
        nameLower: "shared prefix b",
      }) as StoredCatalogDoc,
      validCatalogInput({
        catalogId: "ccc-row",
        name: "Shared Prefix C",
        nameLower: "shared prefix c",
      }) as StoredCatalogDoc,
      validCatalogInput({
        catalogId: "ddd-row",
        name: "Shared Prefix D",
        nameLower: "shared prefix d",
      }) as StoredCatalogDoc,
    ]);

    const repo = new ExerciseCatalogRepository(db);
    const page1 = await repo.searchByPrefix(staffCtx("gym-a"), {
      query: "shared",
      limit: 2,
    });
    const page2 = await repo.searchByPrefix(staffCtx("gym-a"), {
      query: "shared",
      limit: 2,
      startAfterId: page1.nextCursor,
    });

    expect(page1.items.map((item) => item.id)).toEqual(["aaa-row", "bbb-row"]);
    expect(page1.hasMore).toBe(true);
    expect(page2.items.map((item) => item.id)).toEqual(["ccc-row", "ddd-row"]);
    expect(page2.hasMore).toBe(false);
  });

  it("uses stable document-id tie-breaking for identical nameLower values", async () => {
    const { db } = buildDualStreamCatalogMock([
      validCatalogInput({
        catalogId: "bbb",
        name: "Shared Name",
        nameLower: "shared name",
      }) as StoredCatalogDoc,
      validCatalogInput({
        catalogId: "aaa",
        name: "Shared Name",
        nameLower: "shared name",
      }) as StoredCatalogDoc,
    ]);

    const repo = new ExerciseCatalogRepository(db);
    const page = await repo.searchByPrefix(staffCtx("gym-a"), {
      query: "shared",
      limit: 10,
    });

    expect(page.items.map((item) => item.id)).toEqual(["aaa", "bbb"]);
  });

  it("reports hasMore accurately on the final page", async () => {
    const { db } = buildDualStreamCatalogMock([
      validCatalogInput({
        catalogId: "one",
        name: "Press One",
        nameLower: "press one",
      }) as StoredCatalogDoc,
      validCatalogInput({
        catalogId: "two",
        name: "Press Two",
        nameLower: "press two",
      }) as StoredCatalogDoc,
      validCatalogInput({
        catalogId: "three",
        name: "Press Three",
        nameLower: "press three",
      }) as StoredCatalogDoc,
    ]);

    const repo = new ExerciseCatalogRepository(db);
    const page1 = await repo.searchByPrefix(staffCtx("gym-a"), {
      query: "press",
      limit: 2,
    });
    const page2 = await repo.searchByPrefix(staffCtx("gym-a"), {
      query: "press",
      limit: 2,
      startAfterId: page1.nextCursor,
    });

    expect(page1.hasMore).toBe(true);
    expect(page1.nextCursor).toBeTruthy();
    expect(page2.hasMore).toBe(false);
    expect(page2.nextCursor).toBeNull();
  });

  it("excludes inactive catalog records", async () => {
    const { db } = buildDualStreamCatalogMock([
      validCatalogInput({
        catalogId: "active-row",
        name: "Active Press",
        nameLower: "active press",
      }) as StoredCatalogDoc,
      validCatalogInput({
        catalogId: "inactive-row",
        name: "Inactive Press",
        nameLower: "inactive press",
        isActive: false,
      }) as StoredCatalogDoc,
    ]);

    const repo = new ExerciseCatalogRepository(db);
    const page = await repo.searchByPrefix(staffCtx("gym-a"), {
      query: "press",
      limit: 10,
    });

    expect(page.items.map((item) => item.id)).toEqual(["active-row"]);
  });

  it("supports muscle-group filtering with encoded cursors", async () => {
    const { db } = buildDualStreamCatalogMock([
      validCatalogInput({
        catalogId: "chest-press",
        name: "Chest Press",
        nameLower: "chest press",
        muscleGroup: "CHEST",
      }) as StoredCatalogDoc,
      validCatalogInput({
        catalogId: "leg-press",
        name: "Leg Press",
        nameLower: "leg press",
        muscleGroup: "LEGS",
      }) as StoredCatalogDoc,
    ]);

    const repo = new ExerciseCatalogRepository(db);
    const page = await repo.searchByPrefix(staffCtx("gym-a"), {
      query: "press",
      muscleGroup: "CHEST",
      limit: 10,
    });

    expect(page.items.map((item) => item.id)).toEqual(["chest-press"]);
  });

  it("walks more than two pages without duplicates or omissions", async () => {
    const docs = Array.from({ length: 7 }, (_, index) =>
      validCatalogInput({
        catalogId: `press-${index}`,
        name: `Press ${index}`,
        nameLower: `press ${index}`,
      }) as StoredCatalogDoc,
    );
    const { db } = buildDualStreamCatalogMock(docs);
    const repo = new ExerciseCatalogRepository(db);
    const { ids } = await collectSearchPages(repo, "press", { limit: 2 });

    expect(ids).toEqual(docs.map((doc) => doc.catalogId));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("rejects cursors that do not reference existing catalog documents", async () => {
    const cursor = encodeCatalogSearchCursor({
      v: 1,
      token: "press",
      muscleGroup: null,
      boundaryNameLower: "missing",
      boundaryId: "missing-catalog-id",
      nameAfterId: null,
      prefixAfterId: null,
    });
    const { db } = buildDualStreamCatalogMock([
      validCatalogInput({
        catalogId: "alpha-press",
        name: "Alpha Press",
        nameLower: "alpha press",
      }) as StoredCatalogDoc,
    ]);
    const repo = new ExerciseCatalogRepository(db);

    await expect(
      repo.searchByPrefix(staffCtx("gym-a"), {
        query: "press",
        startAfterId: cursor,
      }),
    ).rejects.toBeInstanceOf(InvalidPaginationCursorError);
  });
});

describe("paginateMergedCatalogSearch regression", () => {
  it("does not skip prefix-only rows after a shared single-stream cursor boundary", async () => {
    const nameOnly = {
      id: "alpha-bench",
      catalogId: "alpha-bench",
      nameLower: "alpha bench",
    } as ExerciseCatalogDoc & { id: string };
    const shared = {
      id: "beta-bench",
      catalogId: "beta-bench",
      nameLower: "beta bench",
    } as ExerciseCatalogDoc & { id: string };
    const prefixOnly = {
      id: "hidden-token",
      catalogId: "hidden-token",
      nameLower: "hidden token",
    } as ExerciseCatalogDoc & { id: string };

    let nameCalls = 0;
    let prefixCalls = 0;

    const page1 = await paginateMergedCatalogSearch({
      limit: 2,
      token: "bench",
      muscleGroup: null,
      usePrefixQuery: true,
      decodedCursor: null,
      resolveCursorSnapshot: async () => null,
      fetchNameRows: async () => {
        nameCalls += 1;
        return nameCalls === 1 ? [nameOnly, shared] : [];
      },
      fetchPrefixRows: async () => {
        prefixCalls += 1;
        return prefixCalls === 1 ? [shared, prefixOnly] : [];
      },
    });

    expect(page1.items.map((item) => item.id)).toEqual(["alpha-bench", "beta-bench"]);
    expect(page1.hasMore).toBe(true);

    const decoded = decodeCatalogSearchCursor(page1.nextCursor!, {
      query: "bench",
      muscleGroup: null,
    });

    const page2 = await paginateMergedCatalogSearch({
      limit: 2,
      token: "bench",
      muscleGroup: null,
      usePrefixQuery: true,
      decodedCursor: decoded,
      resolveCursorSnapshot: async () => null,
      fetchNameRows: async () => [],
      fetchPrefixRows: async () => [prefixOnly],
    });

    expect(page2.items.map((item) => item.id)).toEqual(["hidden-token"]);
    expect(page2.hasMore).toBe(false);
  });
});

describe("browseExerciseCatalog search pagination", () => {
  it("passes opaque cursor pagination fields through for search queries", async () => {
    const exerciseCatalog = {
      listPage: vi.fn(),
      searchByPrefix: vi.fn().mockResolvedValue({
        items: [
          {
            id: "dev-push-up",
            catalogId: "dev-push-up",
            name: "Push Up",
            nameLower: "push up",
            muscleGroup: "CHEST",
            description: null,
            equipment: null,
            difficulty: "beginner",
            primaryMuscles: [],
            isBodyweight: true,
            media: null,
            catalogVersion: "v1",
            isActive: true,
            instructions: [],
            tips: null,
            bodyPart: "chest",
            movementPattern: "push",
            secondaryMuscles: [],
            safetyNotes: null,
            category: "strength",
            provider: validCatalogInput().provider,
            searchPrefixes: [],
            createdAt: ts(),
            updatedAt: ts(),
          },
        ],
        nextCursor: "opaque-cursor",
        hasMore: true,
      }),
    };
    const customExercises = {
      findImportedCatalogIds: vi.fn().mockResolvedValue(new Set()),
    };

    const page = await browseExerciseCatalog({
      ctx: staffCtx("gym-a"),
      repos: catalogRepos(exerciseCatalog, customExercises),
      input: {
        query: "push",
        muscleGroup: "CHEST",
        startAfterId: "opaque-cursor",
        limit: 25,
      },
    });

    expect(page.hasMore).toBe(true);
    expect(page.nextCursor).toBe("opaque-cursor");
    expect(exerciseCatalog.searchByPrefix).toHaveBeenCalledWith(
      staffCtx("gym-a"),
      expect.objectContaining({
        query: "push",
        muscleGroup: "CHEST",
        startAfterId: "opaque-cursor",
        limit: 25,
      }),
    );
  });
});

describe("compareCatalogDocs", () => {
  it("sorts by nameLower then document id", () => {
    expect(
      compareCatalogDocs(
        { id: "b", nameLower: "shared" },
        { id: "a", nameLower: "shared" },
      ),
    ).toBeGreaterThan(0);
  });
});
