import { describe, expect, it } from "vitest";

import exercises from "../data/catalog/exercises.json";
import {
  APPROVED_CARDIO_CATALOG_IDS,
  APPROVED_CATALOG_MUSCLE_GROUP_OVERRIDES,
  APPROVED_FULL_BODY_AND_CARDIO_OVERLAP,
  APPROVED_FULL_BODY_CATALOG_IDS,
  CHIN_TUCK_HOLD_CATALOG_ID,
  DEADLIFT_RDL_CATALOG_ID_PATTERN,
} from "@/lib/catalog/catalog-classification";
import type { CatalogExerciseInput } from "@/lib/catalog/types";
import type { MuscleGroup } from "@/lib/muscle-groups";
import { normalizeExerciseCatalogBrowseTags } from "@/lib/firestore/exercise-catalog-normalize";

const rows = exercises as CatalogExerciseInput[];

describe("approved catalog classification bundle", () => {
  it("retains 601 unique catalogIds", () => {
    expect(rows).toHaveLength(601);
    const ids = rows.map((row) => row.catalogId);
    expect(new Set(ids).size).toBe(601);
  });

  it("applies all 41 muscle group overrides", () => {
    for (const [catalogId, muscleGroup] of Object.entries(
      APPROVED_CATALOG_MUSCLE_GROUP_OVERRIDES,
    )) {
      const row = rows.find((r) => r.catalogId === catalogId);
      expect(row, `missing ${catalogId}`).toBeDefined();
      expect(row!.muscleGroup).toBe(muscleGroup);
    }
    expect(Object.keys(APPROVED_CATALOG_MUSCLE_GROUP_OVERRIDES)).toHaveLength(41);
  });

  it("tags exactly 35 full-body and 16 cardio entries with five overlaps", () => {
    const fullBody = rows.filter((r) => r.fullBody === true);
    const cardio = rows.filter((r) => r.cardio === true);
    expect(fullBody.map((r) => r.catalogId).sort()).toEqual(
      [...APPROVED_FULL_BODY_CATALOG_IDS].sort(),
    );
    expect(cardio.map((r) => r.catalogId).sort()).toEqual(
      [...APPROVED_CARDIO_CATALOG_IDS].sort(),
    );
    expect(APPROVED_FULL_BODY_CATALOG_IDS).toHaveLength(35);
    expect(APPROVED_CARDIO_CATALOG_IDS).toHaveLength(16);
    expect([...APPROVED_FULL_BODY_AND_CARDIO_OVERLAP].sort()).toEqual([
      "air-bike",
      "battle-rope-double-slam",
      "battle-ropes",
      "burpees",
      "rowing-machine",
    ]);
    const union = new Set([
      ...fullBody.map((r) => r.catalogId),
      ...cardio.map((r) => r.catalogId),
    ]);
    expect(union.size).toBe(46);
  });

  it("keeps deadlift/RDL variations out of full body", () => {
    const deadliftRows = rows.filter((r) =>
      DEADLIFT_RDL_CATALOG_ID_PATTERN.test(r.catalogId),
    );
    expect(deadliftRows.length).toBeGreaterThanOrEqual(21);
    for (const row of deadliftRows) {
      expect(row.fullBody).not.toBe(true);
    }
  });

  it("preserves chin tuck muscle metadata while grouping under CORE", () => {
    const chin = rows.find((r) => r.catalogId === CHIN_TUCK_HOLD_CATALOG_ID);
    expect(chin).toBeDefined();
    expect(chin!.muscleGroup).toBe("CORE");
    expect(chin!.primaryMuscles?.length).toBeGreaterThan(0);
    expect(
      chin!.primaryMuscles?.some((m) =>
        /deep_neck_flexors|sternocleidomastoid/i.test(m),
      ),
    ).toBe(false);
  });

  it("defaults legacy missing browse tags to false on read", () => {
    const legacy = normalizeExerciseCatalogBrowseTags({});
    expect(legacy.fullBody).toBe(false);
    expect(legacy.cardio).toBe(false);
  });

  it("matches post-change muscle group distribution", () => {
    const counts: Partial<Record<MuscleGroup, number>> = {};
    for (const row of rows) {
      counts[row.muscleGroup] = (counts[row.muscleGroup] ?? 0) + 1;
    }
    expect(counts).toEqual({
      CORE: 83,
      LEGS: 222,
      BACK: 87,
      CHEST: 66,
      SHOULDERS: 74,
      ARMS: 69,
    });
  });
});
