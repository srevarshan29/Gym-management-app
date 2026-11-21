import { beforeEach, describe, expect, it, vi } from "vitest";
import exercises from "../data/catalog/exercises.json";

import type { MemberContext } from "@/lib/firestore/context";
import type { DocWithId } from "@/lib/firestore/repositories/base";
import type { ExerciseCatalogDoc, MuscleGroup } from "@/lib/firestore/types";
import { exerciseMatchesMemberLibraryRegion } from "@/lib/member-portal/member-muscle-region-filter";
import {
  isMemberLibraryRegionBrowseCursor,
  MEMBER_LIBRARY_REGION_CURSOR_PREFIX,
  MemberLibraryRegionPaginationError,
} from "@/lib/workout-tracking/member-library-region-browse-cursor";
import {
  browseMemberExerciseCatalog,
  browseMemberLibraryRegionCatalog,
  MEMBER_REGION_CATALOG_SCAN_LIMIT,
  scanMemberLibraryRegionCatalog,
} from "@/lib/workout-tracking/member-catalog-exercises";
import { appendMemberLibraryBrowseItems } from "@/lib/member-portal/member-library-list-load";

const memberCtx: MemberContext = {
  kind: "member",
  gymId: "gym-a",
  memberId: "member-a",
};

const REPO_PAGE_SIZE = 50;

vi.mock("@/lib/firestore", () => ({
  getRepositories: vi.fn(),
}));

import { getRepositories } from "@/lib/firestore";

function catalogDocsFromJson(): DocWithId<ExerciseCatalogDoc>[] {
  return exercises.map((row) => ({
    id: row.catalogId,
    catalogId: row.catalogId,
    name: row.name,
    nameLower: row.name.toLowerCase(),
    muscleGroup: row.muscleGroup as MuscleGroup,
    primaryMuscles: row.primaryMuscles ?? [],
    isActive: true,
    equipment: row.equipment ?? null,
    isBodyweight: row.isBodyweight ?? false,
    media: {},
    instructions: row.instructions ?? [],
    catalogVersion: "test",
  })) as DocWithId<ExerciseCatalogDoc>[];
}

function compareCatalogBrowseOrder(
  a: DocWithId<ExerciseCatalogDoc>,
  b: DocWithId<ExerciseCatalogDoc>,
): number {
  const aKey = a.nameLower ?? a.name.toLowerCase();
  const bKey = b.nameLower ?? b.name.toLowerCase();
  const byName = aKey.localeCompare(bKey);
  if (byName !== 0) return byName;
  return a.catalogId.localeCompare(b.catalogId);
}

function createRepositoryListPageMock(allDocs: DocWithId<ExerciseCatalogDoc>[]) {
  return vi.fn(
    async (
      _ctx: MemberContext,
      options: {
        muscleGroup?: MuscleGroup | null;
        limit?: number;
        startAfterId?: string | null;
        activeOnly?: boolean;
      },
    ) => {
      const muscleGroup = options.muscleGroup;
      if (!muscleGroup) {
        return { items: [], nextCursor: null, hasMore: false };
      }
      let pool = allDocs
        .filter((doc) => doc.muscleGroup === muscleGroup && doc.isActive !== false)
        .sort(compareCatalogBrowseOrder);

      const cursor = options.startAfterId?.trim();
      if (cursor) {
        const idx = pool.findIndex((doc) => doc.catalogId === cursor);
        pool = idx >= 0 ? pool.slice(idx + 1) : [];
      }

      const requested = options.limit ?? REPO_PAGE_SIZE;
      const pageSize = Math.min(requested, REPO_PAGE_SIZE);
      const window = pool.slice(0, pageSize + 1);
      const hasMore = window.length > pageSize;
      const items = hasMore ? window.slice(0, pageSize) : window;
      return {
        items,
        nextCursor: hasMore ? items[items.length - 1]!.catalogId : null,
        hasMore,
      };
    },
  );
}

const ALL_DOCS = catalogDocsFromJson();

function expectedRegionIds(
  group: MemberLibraryMuscleFilter,
  regionId: string,
): string[] {
  return ALL_DOCS.filter(
    (doc) =>
      doc.muscleGroup === group &&
      exerciseMatchesMemberLibraryRegion({
        muscleGroup: doc.muscleGroup,
        exerciseName: doc.name,
        primaryMuscles: doc.primaryMuscles ?? [],
        libraryGroup: group,
        regionId,
      }),
  )
    .sort(compareCatalogBrowseOrder)
    .map((doc) => doc.catalogId);
}

type MemberLibraryMuscleFilter =
  | "BACK"
  | "SHOULDERS"
  | "CHEST"
  | "ARMS"
  | "LEGS"
  | "CORE";

const REGION_SPECS = [
  { group: "BACK" as const, region: "lats", count: 65 },
  { group: "BACK" as const, region: "spinal-erectors", count: 13 },
  { group: "BACK" as const, region: "trapezius", count: 13 },
  { group: "SHOULDERS" as const, region: "front-delts", count: 40 },
  { group: "SHOULDERS" as const, region: "side-delts", count: 32 },
  { group: "SHOULDERS" as const, region: "rear-delts", count: 12 },
  { group: "CHEST" as const, region: "UPPER", count: 8 },
  { group: "CHEST" as const, region: "MID", count: 48 },
  { group: "CHEST" as const, region: "LOWER", count: 10 },
  { group: "ARMS" as const, region: "biceps", count: 27 },
  { group: "ARMS" as const, region: "brachialis", count: 10 },
  { group: "ARMS" as const, region: "triceps", count: 25 },
  { group: "ARMS" as const, region: "brachioradialis", count: 4 },
  { group: "LEGS" as const, region: "quadriceps", count: 95 },
  { group: "LEGS" as const, region: "hamstrings", count: 49 },
  { group: "LEGS" as const, region: "glutes", count: 126 },
  { group: "LEGS" as const, region: "calves", count: 21 },
  { group: "CORE" as const, region: "front-abs", count: 50 },
  { group: "CORE" as const, region: "side-abs", count: 23 },
  { group: "CORE" as const, region: "deep-core", count: 11 },
  { group: "CORE" as const, region: "lower-back", count: 18 },
];

async function collectAllUiIds(
  listPage: ReturnType<typeof createRepositoryListPageMock>,
  spec: (typeof REGION_SPECS)[number],
  uiLimit = 20,
): Promise<string[]> {
  const collected: string[] = [];
  let cursor: string | null = null;
  for (let pages = 0; pages < 20; pages++) {
    const page = await browseMemberExerciseCatalog(memberCtx, {
      muscleGroup: spec.group,
      libraryGroup: spec.group,
      libraryRegion: spec.region,
      limit: uiLimit,
      startAfterId: cursor,
    });
    for (const item of page.items) {
      expect(collected).not.toContain(item.catalogId);
      collected.push(item.catalogId);
    }
    if (!page.hasMore) break;
    expect(page.nextCursor).toBeTruthy();
    expect(page.nextCursor!.startsWith(MEMBER_LIBRARY_REGION_CURSOR_PREFIX)).toBe(
      true,
    );
    cursor = page.nextCursor;
  }
  return collected;
}

describe("scanMemberLibraryRegionCatalog pagination", () => {
  let listPage: ReturnType<typeof createRepositoryListPageMock>;

  beforeEach(() => {
    listPage = createRepositoryListPageMock(ALL_DOCS);
    vi.mocked(getRepositories).mockReturnValue({
      exerciseCatalog: { listPage, searchByPrefix: vi.fn() },
    } as never);
  });

  it("scans all BACK and SHOULDERS documents across 50-doc pages", async () => {
    const backScan = await scanMemberLibraryRegionCatalog(memberCtx, { listPage }, {
      muscleGroup: "BACK",
      libraryGroup: "BACK",
      regionId: "lats",
    });
    expect(backScan.scannedDocumentCount).toBe(87);
    expect(backScan.scanExhausted).toBe(true);
    expect(backScan.scanCapReached).toBe(false);
    expect(listPage).toHaveBeenCalledTimes(2);

    listPage.mockClear();
    const shoulderScan = await scanMemberLibraryRegionCatalog(memberCtx, { listPage }, {
      muscleGroup: "SHOULDERS",
      libraryGroup: "SHOULDERS",
      regionId: "front-delts",
    });
    expect(shoulderScan.scannedDocumentCount).toBe(74);
    expect(shoulderScan.scanExhausted).toBe(true);
    expect(listPage).toHaveBeenCalledTimes(2);
  });

  it("scans all CHEST documents across 50-doc pages", async () => {
    const chestScan = await scanMemberLibraryRegionCatalog(memberCtx, { listPage }, {
      muscleGroup: "CHEST",
      libraryGroup: "CHEST",
      regionId: "UPPER",
    });
    expect(chestScan.scannedDocumentCount).toBe(66);
    expect(chestScan.scanExhausted).toBe(true);
    expect(listPage).toHaveBeenCalledTimes(2);
  });

  it("scans all ARMS documents across 50-doc pages", async () => {
    const armsScan = await scanMemberLibraryRegionCatalog(memberCtx, { listPage }, {
      muscleGroup: "ARMS",
      libraryGroup: "ARMS",
      regionId: "biceps",
    });
    expect(armsScan.scannedDocumentCount).toBe(69);
    expect(armsScan.scanExhausted).toBe(true);
    expect(armsScan.filteredItems).toHaveLength(27);
    expect(listPage).toHaveBeenCalledTimes(2);
  });

  it("scans all LEGS documents within the 300 cap", async () => {
    const legsScan = await scanMemberLibraryRegionCatalog(memberCtx, { listPage }, {
      muscleGroup: "LEGS",
      libraryGroup: "LEGS",
      regionId: "glutes",
    });
    expect(legsScan.scannedDocumentCount).toBe(222);
    expect(legsScan.scanExhausted).toBe(true);
    expect(legsScan.scanCapReached).toBe(false);
    expect(legsScan.filteredItems).toHaveLength(126);
    expect(listPage).toHaveBeenCalledTimes(5);
    expect(MEMBER_REGION_CATALOG_SCAN_LIMIT).toBeGreaterThanOrEqual(222);
  });

  it("scans all CORE documents across 50-doc pages", async () => {
    const coreScan = await scanMemberLibraryRegionCatalog(memberCtx, { listPage }, {
      muscleGroup: "CORE",
      libraryGroup: "CORE",
      regionId: "front-abs",
    });
    expect(coreScan.scannedDocumentCount).toBe(83);
    expect(coreScan.scanExhausted).toBe(true);
    expect(coreScan.scanCapReached).toBe(false);
    expect(coreScan.filteredItems).toHaveLength(50);
    expect(listPage).toHaveBeenCalledTimes(2);
  });

  it("pages browse-all Core without a region filter to all 83 ids", async () => {
    const collected: string[] = [];
    let cursor: string | null = null;
    for (let page = 0; page < 10; page++) {
      const result = await browseMemberExerciseCatalog(memberCtx, {
        muscleGroup: "CORE",
        limit: 20,
        startAfterId: cursor,
      });
      for (const item of result.items) {
        expect(collected).not.toContain(item.catalogId);
        collected.push(item.catalogId);
      }
      if (!result.hasMore) break;
      cursor = result.nextCursor;
    }
    expect(collected).toHaveLength(83);
    expect(new Set(collected).size).toBe(83);
  });

  it("returns expected region counts after full scan", async () => {
    for (const spec of REGION_SPECS) {
      listPage.mockClear();
      const result = await scanMemberLibraryRegionCatalog(memberCtx, { listPage }, {
        muscleGroup: spec.group,
        libraryGroup: spec.group,
        regionId: spec.region,
      });
      expect(result.filteredItems).toHaveLength(spec.count);
    }
  });

  it("stops at configured scan limit and marks cap reached", async () => {
    listPage.mockClear();
    const limited = await scanMemberLibraryRegionCatalog(memberCtx, { listPage }, {
      muscleGroup: "BACK",
      libraryGroup: "BACK",
      regionId: "lats",
      scanLimit: 60,
    });
    expect(limited.scannedDocumentCount).toBe(60);
    expect(limited.scanExhausted).toBe(false);
    expect(limited.scanCapReached).toBe(true);
    expect(limited.filteredItems.length).toBeLessThan(65);
  });
});

describe("browseMemberExerciseCatalog region UI pagination", () => {
  let listPage: ReturnType<typeof createRepositoryListPageMock>;

  beforeEach(() => {
    listPage = createRepositoryListPageMock(ALL_DOCS);
    vi.mocked(getRepositories).mockReturnValue({
      exerciseCatalog: { listPage, searchByPrefix: vi.fn() },
    } as never);
  });

  for (const spec of REGION_SPECS) {
    it(`concatenates UI pages for ${spec.group} / ${spec.region} (${spec.count})`, async () => {
      listPage.mockClear();
      const uiIds = await collectAllUiIds(listPage, spec);
      const expected = expectedRegionIds(spec.group, spec.region);
      expect(uiIds).toEqual(expected);
      expect(uiIds).toHaveLength(spec.count);
    });
  }

  it("keeps buffered matches across UI pages (mid chest)", async () => {
    listPage.mockClear();
    const first = await browseMemberExerciseCatalog(memberCtx, {
      muscleGroup: "CHEST",
      libraryGroup: "CHEST",
      libraryRegion: "MID",
      limit: 30,
    });
    expect(first.items.length).toBe(30);
    expect(first.hasMore).toBe(true);
    const second = await browseMemberExerciseCatalog(memberCtx, {
      muscleGroup: "CHEST",
      libraryGroup: "CHEST",
      libraryRegion: "MID",
      limit: 30,
      startAfterId: first.nextCursor,
    });
    const ids = [...first.items, ...second.items].map((r) => r.catalogId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(48);
  });

  it("reports hasMore when scan cap is hit before group exhaustion", async () => {
    const capped = await browseMemberLibraryRegionCatalog(
      memberCtx,
      { listPage },
      {
        muscleGroup: "BACK",
        libraryGroup: "BACK",
        regionId: "lats",
        limit: 100,
        scanLimit: 60,
      },
    );
    expect(capped.items.length).toBeLessThan(65);
    expect(capped.hasMore).toBe(true);
    expect(capped.nextCursor?.startsWith(MEMBER_LIBRARY_REGION_CURSOR_PREFIX)).toBe(
      true,
    );
  });

  it("rejects bare catalog ids as region continuation cursors", async () => {
    const first = await browseMemberExerciseCatalog(memberCtx, {
      muscleGroup: "SHOULDERS",
      libraryGroup: "SHOULDERS",
      libraryRegion: "front-delts",
      limit: 20,
    });
  const catalogId = first.items[0]!.catalogId;
  await expect(
    browseMemberExerciseCatalog(memberCtx, {
      muscleGroup: "SHOULDERS",
      libraryGroup: "SHOULDERS",
      libraryRegion: "front-delts",
      startAfterId: catalogId,
    }),
  ).rejects.toBeInstanceOf(MemberLibraryRegionPaginationError);
  await expect(
    browseMemberLibraryRegionCatalog(memberCtx, { listPage }, {
      muscleGroup: "SHOULDERS",
      libraryGroup: "SHOULDERS",
      regionId: "front-delts",
      startAfterId: "arnold-press",
    }),
  ).rejects.toThrow(MemberLibraryRegionPaginationError);
  });

  it("resumes with valid mbr1 cursor and preserves pending scan state", async () => {
    const first = await browseMemberLibraryRegionCatalog(memberCtx, { listPage }, {
      muscleGroup: "SHOULDERS",
      libraryGroup: "SHOULDERS",
      regionId: "front-delts",
      limit: 20,
    });
    expect(isMemberLibraryRegionBrowseCursor(first.nextCursor)).toBe(true);
    listPage.mockClear();
    const second = await browseMemberLibraryRegionCatalog(memberCtx, { listPage }, {
      muscleGroup: "SHOULDERS",
      libraryGroup: "SHOULDERS",
      regionId: "front-delts",
      limit: 20,
      startAfterId: first.nextCursor,
    });
    expect(second.items).toHaveLength(20);
    const overlap = second.items.filter((row) =>
      first.items.some((f) => f.catalogId === row.catalogId),
    );
    expect(overlap).toHaveLength(0);
    expect(listPage).toHaveBeenCalled();
  });

  it("continues when libraryGroup is omitted but muscleGroup matches cursor", async () => {
    const first = await browseMemberExerciseCatalog(memberCtx, {
      muscleGroup: "SHOULDERS",
      libraryRegion: "front-delts",
      limit: 20,
    });
    const second = await browseMemberExerciseCatalog(memberCtx, {
      muscleGroup: "SHOULDERS",
      libraryRegion: "front-delts",
      startAfterId: first.nextCursor,
      limit: 20,
    });
    const ids = [...first.items, ...second.items].map((row) => row.catalogId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(40);
  });

  it("rejects continuation cursor when region changes", async () => {
    const first = await browseMemberLibraryRegionCatalog(memberCtx, { listPage }, {
      muscleGroup: "SHOULDERS",
      libraryGroup: "SHOULDERS",
      regionId: "front-delts",
      limit: 20,
    });
    await expect(
      browseMemberLibraryRegionCatalog(memberCtx, { listPage }, {
        muscleGroup: "SHOULDERS",
        libraryGroup: "SHOULDERS",
        regionId: "side-delts",
        startAfterId: first.nextCursor,
      }),
    ).rejects.toBeInstanceOf(MemberLibraryRegionPaginationError);
  });

  it("allows initial region request with null cursor", async () => {
    const page = await browseMemberLibraryRegionCatalog(memberCtx, { listPage }, {
      muscleGroup: "SHOULDERS",
      libraryGroup: "SHOULDERS",
      regionId: "front-delts",
      startAfterId: null,
    });
    expect(page.items.length).toBeGreaterThan(0);
    expect(page.nextCursor?.startsWith(MEMBER_LIBRARY_REGION_CURSOR_PREFIX)).toBe(
      true,
    );
  });

  it("deduplicates appended browse rows by catalogId", () => {
    const rows = [
      { catalogId: "a", name: "A" },
      { catalogId: "b", name: "B" },
    ] as never;
    const merged = appendMemberLibraryBrowseItems(rows, [
      { catalogId: "b", name: "B2" },
      { catalogId: "c", name: "C" },
    ] as never);
    expect(merged.map((r) => r.catalogId)).toEqual(["a", "b", "c"]);
  });

  it("does not use multi-page scan when browse has no region filter", async () => {
    listPage.mockClear();
    await browseMemberExerciseCatalog(memberCtx, {
      muscleGroup: "BACK",
      limit: 20,
      startAfterId: ALL_DOCS.filter((d) => d.muscleGroup === "BACK")[20]?.catalogId ?? null,
    });
    expect(listPage).toHaveBeenCalledTimes(1);
    expect(listPage.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ muscleGroup: "BACK", limit: 20 }),
    );
  });
});

describe("scan limit constant", () => {
  it("keeps member region scan cap at 300", () => {
    expect(MEMBER_REGION_CATALOG_SCAN_LIMIT).toBe(300);
  });
});