import { describe, expect, it } from "vitest";

import { parseMemberLibraryMuscleGroup } from "@/lib/member-portal/member-library-muscle-groups";
import {
  memberLibraryRegionBrowseAllFromUrl,
  parseMemberLibraryRegionForGroup,
} from "@/lib/member-portal/member-muscle-region-filter";
import {
  memberWorkoutPageHref,
  parseMemberWorkoutTab,
} from "@/lib/member-portal/member-workout-tab-url";

describe("member library region URLs", () => {
  it("preserves chest URLs", () => {
    expect(
      memberWorkoutPageHref({
        tab: "library",
        group: "CHEST",
        libraryRegion: "UPPER",
      }),
    ).toBe("/member/workout?tab=library&group=CHEST&region=upper");
    expect(
      memberWorkoutPageHref({
        tab: "library",
        group: "CHEST",
        browseAllInGroup: true,
      }),
    ).toBe("/member/workout?tab=library&group=CHEST&chestAll=1");
  });

  it("encodes back region and browse-all params", () => {
    expect(
      memberWorkoutPageHref({
        tab: "library",
        group: "BACK",
        libraryRegion: "lats",
      }),
    ).toBe("/member/workout?tab=library&group=BACK&region=lats");
    expect(
      memberWorkoutPageHref({
        tab: "library",
        group: "BACK",
        browseAllInGroup: true,
      }),
    ).toBe("/member/workout?tab=library&group=BACK&backAll=1");
  });

  it("encodes shoulder region and browse-all params", () => {
    expect(
      memberWorkoutPageHref({
        tab: "library",
        group: "SHOULDERS",
        libraryRegion: "rear-delts",
      }),
    ).toBe("/member/workout?tab=library&group=SHOULDERS&region=rear-delts");
    expect(
      memberWorkoutPageHref({
        tab: "library",
        group: "SHOULDERS",
        browseAllInGroup: true,
      }),
    ).toBe("/member/workout?tab=library&group=SHOULDERS&shouldersAll=1");
  });

  it("encodes arm region and browse-all params", () => {
    expect(
      memberWorkoutPageHref({
        tab: "library",
        group: "ARMS",
        libraryRegion: "brachioradialis",
      }),
    ).toBe("/member/workout?tab=library&group=ARMS&region=brachioradialis");
    expect(
      memberWorkoutPageHref({
        tab: "library",
        group: "ARMS",
        browseAllInGroup: true,
      }),
    ).toBe("/member/workout?tab=library&group=ARMS&armsAll=1");
  });

  it("encodes leg region and browse-all params", () => {
    expect(
      memberWorkoutPageHref({
        tab: "library",
        group: "LEGS",
        libraryRegion: "glutes",
      }),
    ).toBe("/member/workout?tab=library&group=LEGS&region=glutes");
    expect(
      memberWorkoutPageHref({
        tab: "library",
        group: "LEGS",
        browseAllInGroup: true,
      }),
    ).toBe("/member/workout?tab=library&group=LEGS&legsAll=1");
  });

  it("encodes core region and browse-all params", () => {
    expect(
      memberWorkoutPageHref({
        tab: "library",
        group: "CORE",
        libraryRegion: "lower-back",
      }),
    ).toBe("/member/workout?tab=library&group=CORE&region=lower-back");
    expect(
      memberWorkoutPageHref({
        tab: "library",
        group: "CORE",
        browseAllInGroup: true,
      }),
    ).toBe("/member/workout?tab=library&group=CORE&coreAll=1");
  });

  it("round-trips region query from URLSearchParams", () => {
    const params = new URLSearchParams(
      "tab=library&group=SHOULDERS&region=side-delts",
    );
    const group = parseMemberLibraryMuscleGroup(params.get("group"));
    expect(parseMemberLibraryRegionForGroup(group, params.get("region"))).toBe(
      "side-delts",
    );
    expect(parseMemberWorkoutTab(params.get("tab"))).toBe("exercises");
  });

  it("reads browse-all flags per muscle group", () => {
    expect(
      memberLibraryRegionBrowseAllFromUrl(
        "BACK",
        new URLSearchParams("group=BACK&backAll=1"),
      ),
    ).toBe(true);
    expect(
      memberLibraryRegionBrowseAllFromUrl(
        "SHOULDERS",
        new URLSearchParams("group=SHOULDERS&shouldersAll=1"),
      ),
    ).toBe(true);
    expect(
      memberLibraryRegionBrowseAllFromUrl(
        "ARMS",
        new URLSearchParams("group=ARMS&armsAll=1"),
      ),
    ).toBe(true);
    expect(
      memberLibraryRegionBrowseAllFromUrl(
        "LEGS",
        new URLSearchParams("group=LEGS&legsAll=1"),
      ),
    ).toBe(true);
    expect(
      memberLibraryRegionBrowseAllFromUrl(
        "CORE",
        new URLSearchParams("group=CORE&coreAll=1"),
      ),
    ).toBe(true);
  });
});