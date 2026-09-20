import type { Query, QueryDocumentSnapshot } from "firebase-admin/firestore";
import { describe, expect, it, vi } from "vitest";

import { queryPageByNumber } from "@/lib/firestore/pagination";

type MockDoc = { id: string; sort: number };

function mockSnapshot(docs: MockDoc[]): QueryDocumentSnapshot[] {
  return docs.map((doc) => ({
    id: doc.id,
    data: () => ({ sort: doc.sort }),
  })) as unknown as QueryDocumentSnapshot[];
}

function createMockQuery(allDocs: MockDoc[]): Query {
  const ordered = [...allDocs].sort((a, b) => b.sort - a.sort);

  const snapshotFor = (cursorId: string | undefined, limit: number) => {
    let startIndex = 0;
    if (cursorId) {
      const cursorIndex = ordered.findIndex((doc) => doc.id === cursorId);
      startIndex = cursorIndex >= 0 ? cursorIndex + 1 : ordered.length;
    }
    const slice = ordered.slice(startIndex, startIndex + limit);
    return {
      empty: slice.length === 0,
      docs: mockSnapshot(slice),
    };
  };

  const buildQuery = (cursorId?: string) => ({
    limit: vi.fn((limit: number) => ({
      startAfter: vi.fn((cursor: QueryDocumentSnapshot) =>
        buildTerminalQuery(cursor.id, limit),
      ),
      get: vi.fn(async () => snapshotFor(cursorId, limit)),
    })),
  });

  const buildTerminalQuery = (cursorId: string, limit: number) => ({
    get: vi.fn(async () => snapshotFor(cursorId, limit)),
  });

  return buildQuery() as unknown as Query;
}

describe("queryPageByNumber", () => {
  const docs = Array.from({ length: 120 }, (_, i) => ({
    id: `doc-${i + 1}`,
    sort: i + 1,
  }));

  it("returns the first page", async () => {
    const query = createMockQuery(docs);
    const page = await queryPageByNumber(query, 1, 50);
    expect(page.map((d) => d.id)).toEqual(
      docs
        .slice()
        .sort((a, b) => b.sort - a.sort)
        .slice(0, 50)
        .map((d) => d.id),
    );
  });

  it("returns a later page without overlapping prior pages", async () => {
    const query = createMockQuery(docs);
    const page1 = await queryPageByNumber(query, 1, 50);
    const page2 = await queryPageByNumber(query, 2, 50);
    const page3 = await queryPageByNumber(query, 3, 50);

    const ids = new Set([
      ...page1.map((d) => d.id),
      ...page2.map((d) => d.id),
      ...page3.map((d) => d.id),
    ]);

    expect(page1).toHaveLength(50);
    expect(page2).toHaveLength(50);
    expect(page3).toHaveLength(20);
    expect(ids.size).toBe(120);
  });

  it("returns an empty page when the page number is beyond the data", async () => {
    const query = createMockQuery(docs.slice(0, 10));
    const page = await queryPageByNumber(query, 3, 50);
    expect(page).toEqual([]);
  });
});
