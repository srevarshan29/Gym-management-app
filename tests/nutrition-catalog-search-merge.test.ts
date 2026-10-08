import { describe, expect, it } from "vitest";

/** Mirrors repository dedupe: last write wins, then cap. */
function mergeCatalogSearchRows<T extends { foodId: string }>(
  resultSets: T[][],
  cap: number,
): T[] {
  const byFoodId = new Map<string, T>();
  for (const rows of resultSets) {
    for (const row of rows) {
      byFoodId.set(row.foodId, row);
    }
  }
  return [...byFoodId.values()].slice(0, cap);
}

describe("nutrition catalog search merge", () => {
  it("dedupes parallel query results by foodId", () => {
    const merged = mergeCatalogSearchRows(
      [
        [{ foodId: "a", name: "A1" } as { foodId: string; name: string }],
        [
          { foodId: "a", name: "A2" },
          { foodId: "b", name: "B" },
        ],
      ],
      8,
    );
    expect(merged).toHaveLength(2);
    expect(merged.find((r) => r.foodId === "a")?.name).toBe("A2");
  });

  it("respects merged candidate cap", () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({
      foodId: `id-${i}`,
    }));
    const merged = mergeCatalogSearchRows([rows], 8);
    expect(merged).toHaveLength(8);
  });
});
