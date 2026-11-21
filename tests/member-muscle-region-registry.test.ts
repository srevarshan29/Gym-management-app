import { describe, expect, it } from "vitest";

import { CHEST_MUSCLE_REGION_CONFIG } from "@/lib/member-portal/muscle-regions/chest";
import {
  CHEST_MEMBER_REGION_MODULE,
  memberLibraryGroupsWithRegions,
  memberLibraryRegionModule,
  shouldShowMemberLibraryRegionPicker,
} from "@/lib/member-portal/muscle-region-registry";

describe("memberLibraryRegionModule", () => {
  it("registers Chest, Back, Shoulders, Arms, Legs, and Core region pickers", () => {
    expect(memberLibraryGroupsWithRegions()).toEqual([
      "CHEST",
      "BACK",
      "SHOULDERS",
      "ARMS",
      "LEGS",
      "CORE",
    ]);
    expect(memberLibraryRegionModule("CHEST")).toBe(CHEST_MEMBER_REGION_MODULE);
    expect(memberLibraryRegionModule("BACK")?.regions).toHaveLength(3);
    expect(memberLibraryRegionModule("BACK")?.regions.map((row) => row.id)).toEqual([
      "lats",
      "spinal-erectors",
      "trapezius",
    ]);
    expect(memberLibraryRegionModule("BACK")?.parseRegion("teres-major")).toBeNull();
    const trapezius = memberLibraryRegionModule("BACK")?.regions.find(
      (row) => row.id === "trapezius",
    );
    expect(trapezius?.primaryMuscleSlug).toBe("trapezius");
    expect(trapezius?.imageSrc).toBe(
      "/images/muscle-groups/regions/back/upper-trapezius.png",
    );
    expect(trapezius).not.toHaveProperty("companionImageSrcs");
    expect(memberLibraryRegionModule("SHOULDERS")?.regions).toHaveLength(3);
    expect(memberLibraryRegionModule("ARMS")?.regions).toHaveLength(4);
    expect(memberLibraryRegionModule("ARMS")?.browseAllQueryKey).toBe("armsAll");
    expect(memberLibraryRegionModule("ARMS")?.regions.map((row) => row.id)).toEqual([
      "biceps",
      "brachialis",
      "triceps",
      "brachioradialis",
    ]);
    expect(memberLibraryRegionModule("LEGS")?.regions).toHaveLength(4);
    expect(memberLibraryRegionModule("LEGS")?.browseAllQueryKey).toBe("legsAll");
    expect(memberLibraryRegionModule("LEGS")?.classifyExerciseName("Squat")).toBe("");
    expect(memberLibraryRegionModule("LEGS")?.regions.map((row) => row.primaryMuscleSlug)).toEqual([
      "quadriceps",
      "hamstrings",
      "gluteus_maximus",
      "gastrocnemius",
    ]);
    expect(memberLibraryRegionModule("CORE")?.regions).toHaveLength(4);
    expect(memberLibraryRegionModule("CORE")?.browseAllQueryKey).toBe("coreAll");
    expect(memberLibraryRegionModule("CORE")?.classifyExerciseName("Plank")).toBe("");
    expect(memberLibraryRegionModule("CORE")?.regions.map((row) => ({
      id: row.id,
      slug: row.primaryMuscleSlug,
      imageSrc: row.imageSrc,
    }))).toEqual([
      {
        id: "front-abs",
        slug: "rectus_abdominis",
        imageSrc: "/images/muscle-groups/regions/core/front%20Abs.jpeg",
      },
      {
        id: "side-abs",
        slug: "obliques",
        imageSrc: "/images/muscle-groups/regions/core/side%20Abs.jpeg",
      },
      {
        id: "deep-core",
        slug: "transverse_abdominis",
        imageSrc: "/images/muscle-groups/regions/core/Deep%20core.jpeg",
      },
      {
        id: "lower-back",
        slug: "erector_spinae",
        imageSrc: "/images/muscle-groups/regions/core/lower%20back.jpeg",
      },
    ]);
    expect(memberLibraryRegionModule("FULL_BODY")).toBeNull();
    expect(memberLibraryRegionModule("CARDIO")).toBeNull();
  });

  it("exposes chest region art and labels from the registry", () => {
    const module = memberLibraryRegionModule("CHEST");
    expect(module?.regions).toEqual(CHEST_MUSCLE_REGION_CONFIG);
    expect(module?.browseAllQueryKey).toBe("chestAll");
    expect(module?.parseRegion("upper")).toBe("UPPER");
    expect(module?.regionQueryValue("MID")).toBe("mid");
    expect(module?.regionLabel("LOWER")).toBe("Lower Chest");
    expect(module?.classifyExerciseName("Incline Bench Press")).toBe("UPPER");
  });
});

describe("shouldShowMemberLibraryRegionPicker", () => {
  it("shows the picker for chest without region, browse-all, or search", () => {
    expect(
      shouldShowMemberLibraryRegionPicker({
        activeGroup: "CHEST",
        activeRegion: null,
        browseAllInGroup: false,
        debouncedQuery: "",
      }),
    ).toBe(true);
  });

  it("hides the picker when a region, browse-all, or search is active", () => {
    expect(
      shouldShowMemberLibraryRegionPicker({
        activeGroup: "CHEST",
        activeRegion: "UPPER",
        browseAllInGroup: false,
        debouncedQuery: "",
      }),
    ).toBe(false);
    expect(
      shouldShowMemberLibraryRegionPicker({
        activeGroup: "CHEST",
        activeRegion: null,
        browseAllInGroup: true,
        debouncedQuery: "",
      }),
    ).toBe(false);
    expect(
      shouldShowMemberLibraryRegionPicker({
        activeGroup: "CHEST",
        activeRegion: null,
        browseAllInGroup: false,
        debouncedQuery: "bench",
      }),
    ).toBe(false);
  });

  it("shows the picker for registered region groups", () => {
    for (const group of ["BACK", "SHOULDERS", "ARMS", "LEGS", "CORE"] as const) {
      expect(
        shouldShowMemberLibraryRegionPicker({
          activeGroup: group,
          activeRegion: null,
          browseAllInGroup: false,
          debouncedQuery: "",
        }),
      ).toBe(true);
    }
  });

  it("does not show a picker for groups without region modules", () => {
    for (const group of ["FULL_BODY", "CARDIO"] as const) {
      expect(
        shouldShowMemberLibraryRegionPicker({
          activeGroup: group,
          activeRegion: null,
          browseAllInGroup: false,
          debouncedQuery: "",
        }),
      ).toBe(false);
    }
  });
});