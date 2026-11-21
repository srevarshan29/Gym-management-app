import { describe, expect, it } from "vitest";

import {
  memberLibraryFilterToCatalogBrowseQuery,
  memberLibraryFilterToCatalogMuscleGroup,
  MEMBER_LIBRARY_MUSCLE_FILTERS,
} from "@/lib/member-portal/member-library-muscle-groups";
import { resolveMemberLibraryView } from "@/lib/member-portal/member-library-view";

describe("member library classification navigation", () => {
  it("exposes eight member browse categories", () => {
    expect(MEMBER_LIBRARY_MUSCLE_FILTERS).toEqual([
      "CHEST",
      "BACK",
      "SHOULDERS",
      "ARMS",
      "LEGS",
      "CORE",
      "FULL_BODY",
      "CARDIO",
    ]);
  });

  it("maps CORE to catalog muscleGroup only", () => {
    expect(memberLibraryFilterToCatalogBrowseQuery("CORE")).toEqual({
      muscleGroup: "CORE",
      fullBody: false,
      cardio: false,
    });
  });

  it("maps Full Body and Cardio to tag filters", () => {
    expect(memberLibraryFilterToCatalogBrowseQuery("FULL_BODY")).toEqual({
      muscleGroup: null,
      fullBody: true,
      cardio: false,
    });
    expect(memberLibraryFilterToCatalogBrowseQuery("CARDIO")).toEqual({
      muscleGroup: null,
      fullBody: false,
      cardio: true,
    });
    expect(memberLibraryFilterToCatalogMuscleGroup("FULL_BODY")).toBeNull();
    expect(memberLibraryFilterToCatalogMuscleGroup("CARDIO")).toBeNull();
  });

  it("keeps chest region picker when browsing chest without search", () => {
    expect(
      resolveMemberLibraryView({
        activeGroup: "CHEST",
        activeRegion: null,
        browseAllInGroup: false,
        debouncedQuery: "",
      }),
    ).toBe("region-picker");
  });
});
