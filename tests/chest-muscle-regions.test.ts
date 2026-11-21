import { describe, expect, it } from "vitest";
import exercises from "../data/catalog/exercises.json";

import {
  CHEST_MUSCLE_REGION_CONFIG,
  classifyChestMuscleRegion,
  parseMemberLibraryChestRegion,
} from "@/lib/member-portal/chest-muscle-regions";

describe("classifyChestMuscleRegion", () => {
  it("maps incline movements to upper chest", () => {
    expect(classifyChestMuscleRegion("Incline Barbell Bench Press")).toBe(
      "UPPER",
    );
    expect(classifyChestMuscleRegion("Incline Push-Up")).toBe("UPPER");
  });

  it("maps decline and dips to lower chest", () => {
    expect(classifyChestMuscleRegion("Decline Bench Press")).toBe("LOWER");
    expect(classifyChestMuscleRegion("Chest Dips")).toBe("LOWER");
    expect(classifyChestMuscleRegion("Weighted Dips")).toBe("LOWER");
  });

  it("defaults flat presses and push-ups to mid chest", () => {
    expect(classifyChestMuscleRegion("Barbell Bench Press")).toBe("MID");
    expect(classifyChestMuscleRegion("Push-Up")).toBe("MID");
    expect(classifyChestMuscleRegion("Cable Fly")).toBe("MID");
  });

  it("assigns every catalog chest exercise to a region", () => {
    const chest = exercises.filter((row) => row.muscleGroup === "CHEST");
    expect(chest.length).toBeGreaterThan(0);
    for (const row of chest) {
      expect(["UPPER", "MID", "LOWER"]).toContain(
        classifyChestMuscleRegion(row.name),
      );
    }
  });
});

describe("parseMemberLibraryChestRegion", () => {
  it("parses URL region values", () => {
    expect(parseMemberLibraryChestRegion("upper")).toBe("UPPER");
    expect(parseMemberLibraryChestRegion("mid")).toBe("MID");
    expect(parseMemberLibraryChestRegion("lower")).toBe("LOWER");
    expect(parseMemberLibraryChestRegion("")).toBeNull();
  });
});

describe("member workout library URLs", () => {
  it("encodes chest region query params", async () => {
    const { memberWorkoutPageHref } = await import(
      "@/lib/member-portal/member-workout-tab-url"
    );
    expect(
      memberWorkoutPageHref({ tab: "library", group: "CHEST", chestRegion: "UPPER" }),
    ).toBe("/member/workout?tab=library&group=CHEST&region=upper");
    expect(
      memberWorkoutPageHref({
        tab: "library",
        group: "CHEST",
        chestBrowseAll: true,
      }),
    ).toBe("/member/workout?tab=library&group=CHEST&chestAll=1");
  });
});

describe("chest region art", () => {
  it("uses new chest region PNG paths", () => {
    for (const region of CHEST_MUSCLE_REGION_CONFIG) {
      expect(region.imageSrc).toMatch(
        /^\/images\/muscle-groups\/regions\/chest\/.+\.png$/,
      );
    }
  });
});
