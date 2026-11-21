import { describe, expect, it } from "vitest";
import exercises from "../data/catalog/exercises.json";

import { exerciseMatchesMemberLibraryRegion } from "@/lib/member-portal/member-muscle-region-filter";

const EXPECTED_PRIMARY_COUNTS: Record<
  string,
  {
    group: "BACK" | "SHOULDERS" | "ARMS" | "LEGS" | "CORE";
    regionId: string;
    count: number;
  }
> = {
  lats: { group: "BACK", regionId: "lats", count: 65 },
  "spinal-erectors": {
    group: "BACK",
    regionId: "spinal-erectors",
    count: 13,
  },
  trapezius: { group: "BACK", regionId: "trapezius", count: 13 },
  "front-delts": { group: "SHOULDERS", regionId: "front-delts", count: 40 },
  "side-delts": { group: "SHOULDERS", regionId: "side-delts", count: 32 },
  "rear-delts": { group: "SHOULDERS", regionId: "rear-delts", count: 12 },
  biceps: { group: "ARMS", regionId: "biceps", count: 27 },
  brachialis: { group: "ARMS", regionId: "brachialis", count: 10 },
  triceps: { group: "ARMS", regionId: "triceps", count: 25 },
  brachioradialis: { group: "ARMS", regionId: "brachioradialis", count: 4 },
  quadriceps: { group: "LEGS", regionId: "quadriceps", count: 95 },
  hamstrings: { group: "LEGS", regionId: "hamstrings", count: 49 },
  glutes: { group: "LEGS", regionId: "glutes", count: 126 },
  calves: { group: "LEGS", regionId: "calves", count: 21 },
  "front-abs": { group: "CORE", regionId: "front-abs", count: 50 },
  "side-abs": { group: "CORE", regionId: "side-abs", count: 23 },
  "deep-core": { group: "CORE", regionId: "deep-core", count: 11 },
  "lower-back": { group: "CORE", regionId: "lower-back", count: 18 },
};

describe("member library primary-muscle region counts", () => {
  for (const [label, spec] of Object.entries(EXPECTED_PRIMARY_COUNTS)) {
    it(`matches ${label} primary count (${spec.count})`, () => {
      const matched = exercises.filter(
        (row) =>
          row.muscleGroup === spec.group &&
          exerciseMatchesMemberLibraryRegion({
            muscleGroup: row.muscleGroup,
            exerciseName: row.name,
            primaryMuscles: row.primaryMuscles ?? [],
            libraryGroup: spec.group,
            regionId: spec.regionId,
          }),
      );
      expect(matched.length).toBe(spec.count);
    });
  }

  it("keeps a shared trapezius primary in one region, including rows that also train lats", () => {
    const shrug = exercises.find(
      (row) => row.catalogId === "smith-machine-shrug",
    );
    const inverted = exercises.find((row) => row.catalogId === "inverted-row");
    expect(
      exerciseMatchesMemberLibraryRegion({
        muscleGroup: "BACK",
        exerciseName: shrug!.name,
        primaryMuscles: shrug!.primaryMuscles ?? [],
        libraryGroup: "BACK",
        regionId: "trapezius",
      }),
    ).toBe(true);
    expect(
      exerciseMatchesMemberLibraryRegion({
        muscleGroup: "BACK",
        exerciseName: inverted!.name,
        primaryMuscles: inverted!.primaryMuscles ?? [],
        libraryGroup: "BACK",
        regionId: "lats",
      }),
    ).toBe(true);
    expect(
      exerciseMatchesMemberLibraryRegion({
        muscleGroup: "BACK",
        exerciseName: inverted!.name,
        primaryMuscles: inverted!.primaryMuscles ?? [],
        libraryGroup: "BACK",
        regionId: "trapezius",
      }),
    ).toBe(true);
    const trapIds = exercises
      .filter(
        (row) =>
          row.muscleGroup === "BACK" &&
          exerciseMatchesMemberLibraryRegion({
            muscleGroup: "BACK",
            exerciseName: row.name,
            primaryMuscles: row.primaryMuscles ?? [],
            libraryGroup: "BACK",
            regionId: "trapezius",
          }),
      )
      .map((row) => row.catalogId);
    expect(new Set(trapIds).size).toBe(trapIds.length);
  });

  it("keeps multi-primary leg exercises in every matching region", () => {
    const squat = exercises.find((row) => row.catalogId === "squat");
    const airBike = exercises.find((row) => row.catalogId === "air-bike");
    const running = exercises.find((row) => row.catalogId === "running");
    expect(squat?.primaryMuscles).toEqual(
      expect.arrayContaining(["quadriceps", "gluteus_maximus"]),
    );
    for (const regionId of ["quadriceps", "glutes"] as const) {
      expect(
        exerciseMatchesMemberLibraryRegion({
          muscleGroup: "LEGS",
          exerciseName: squat!.name,
          primaryMuscles: squat!.primaryMuscles ?? [],
          libraryGroup: "LEGS",
          regionId,
        }),
      ).toBe(true);
    }
    expect(
      exerciseMatchesMemberLibraryRegion({
        muscleGroup: "LEGS",
        exerciseName: squat!.name,
        primaryMuscles: squat!.primaryMuscles ?? [],
        libraryGroup: "LEGS",
        regionId: "hamstrings",
      }),
    ).toBe(false);
    for (const regionId of ["quadriceps", "hamstrings"] as const) {
      expect(
        exerciseMatchesMemberLibraryRegion({
          muscleGroup: "LEGS",
          exerciseName: airBike!.name,
          primaryMuscles: airBike!.primaryMuscles ?? [],
          libraryGroup: "LEGS",
          regionId,
        }),
      ).toBe(true);
    }
    for (const regionId of ["quadriceps", "calves"] as const) {
      expect(
        exerciseMatchesMemberLibraryRegion({
          muscleGroup: "LEGS",
          exerciseName: running!.name,
          primaryMuscles: running!.primaryMuscles ?? [],
          libraryGroup: "LEGS",
          regionId,
        }),
      ).toBe(true);
    }
  });

  it("counts every Legs catalog exercise for browse all", () => {
    expect(exercises.filter((row) => row.muscleGroup === "LEGS")).toHaveLength(222);
  });

  it("keeps core regions on primary slugs and leaves three exercises for browse all", () => {
    const core = exercises.filter((row) => row.muscleGroup === "CORE");
    expect(core).toHaveLength(83);
    const regionIds = ["front-abs", "side-abs", "deep-core", "lower-back"] as const;
    const covered = new Set<string>();
    for (const regionId of regionIds) {
      for (const row of core) {
        if (
          exerciseMatchesMemberLibraryRegion({
            muscleGroup: "CORE",
            exerciseName: row.name,
            primaryMuscles: row.primaryMuscles ?? [],
            libraryGroup: "CORE",
            regionId,
          })
        ) {
          covered.add(row.catalogId);
        }
      }
    }
    expect(covered.size).toBe(80);
    const browseAllOnly = core
      .map((row) => row.catalogId)
      .filter((id) => !covered.has(id))
      .sort();
    expect(browseAllOnly).toEqual(["chin-tuck-hold", "crow-pose", "downward-dog"]);

    const plank = exercises.find((row) => row.catalogId === "plank");
    for (const regionId of ["front-abs", "deep-core"] as const) {
      expect(
        exerciseMatchesMemberLibraryRegion({
          muscleGroup: "CORE",
          exerciseName: plank!.name,
          primaryMuscles: plank!.primaryMuscles ?? [],
          libraryGroup: "CORE",
          regionId,
        }),
      ).toBe(true);
    }
    expect(
      exerciseMatchesMemberLibraryRegion({
        muscleGroup: "CORE",
        exerciseName: plank!.name,
        primaryMuscles: plank!.primaryMuscles ?? [],
        libraryGroup: "CORE",
        regionId: "side-abs",
      }),
    ).toBe(false);

    const deadlift = exercises.find((row) => row.catalogId === "deadlift");
    expect(
      exerciseMatchesMemberLibraryRegion({
        muscleGroup: "BACK",
        exerciseName: deadlift!.name,
        primaryMuscles: deadlift!.primaryMuscles ?? [],
        libraryGroup: "CORE",
        regionId: "lower-back",
      }),
    ).toBe(false);
    const birdDog = exercises.find((row) => row.catalogId === "bird-dog");
    expect(
      exerciseMatchesMemberLibraryRegion({
        muscleGroup: "CORE",
        exerciseName: birdDog!.name,
        primaryMuscles: birdDog!.primaryMuscles ?? [],
        libraryGroup: "BACK",
        regionId: "spinal-erectors",
      }),
    ).toBe(false);
  });
});