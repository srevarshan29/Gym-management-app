import { describe, expect, it } from "vitest";

import {
  memberCatalogExerciseId,
  parseMemberCatalogExerciseId,
} from "@/lib/workout-tracking/member-catalog-exercises";

describe("member exercise library catalog ids", () => {
  it("round-trips catalog exercise ids", () => {
    const catalogId = "repdb:bench-press";
    const exerciseId = memberCatalogExerciseId(catalogId);
    expect(parseMemberCatalogExerciseId(exerciseId)).toBe(catalogId);
  });

  it("rejects non-catalog exercise ids", () => {
    expect(parseMemberCatalogExerciseId("custom-exercise-1")).toBeNull();
    expect(parseMemberCatalogExerciseId(null)).toBeNull();
  });
});
