import { describe, expect, it } from "vitest";

import { parseMemberLibraryMuscleGroup } from "@/lib/member-portal/member-library-muscle-groups";
import {
  memberLibraryRegionBrowseAllFromUrl,
  parseMemberLibraryRegionForGroup,
} from "@/lib/member-portal/member-muscle-region-filter";
import {
  isMemberLibraryRegionPicker,
  resolveMemberLibraryView,
} from "@/lib/member-portal/member-library-view";

function viewFromUrlSearch(search: string) {
  const params = new URLSearchParams(search);
  const group = parseMemberLibraryMuscleGroup(params.get("group"));
  const activeRegion = parseMemberLibraryRegionForGroup(
    group,
    params.get("region"),
  );
  const browseAllInGroup = memberLibraryRegionBrowseAllFromUrl(group, params);
  return resolveMemberLibraryView({
    activeGroup: group,
    activeRegion,
    browseAllInGroup,
    debouncedQuery: "",
  });
}

describe("resolveMemberLibraryView", () => {
  it("shows the muscle group grid on the library home", () => {
    expect(
      resolveMemberLibraryView({
        activeGroup: null,
        activeRegion: null,
        browseAllInGroup: false,
        debouncedQuery: "",
      }),
    ).toBe("muscle-groups");
  });

  it("opens chest regions after selecting Chest (click updates state like URL)", () => {
    expect(
      resolveMemberLibraryView({
        activeGroup: "CHEST",
        activeRegion: null,
        browseAllInGroup: false,
        debouncedQuery: "",
      }),
    ).toBe("region-picker");
    expect(
      isMemberLibraryRegionPicker({
        activeGroup: "CHEST",
        activeRegion: null,
        browseAllInGroup: false,
        debouncedQuery: "",
      }),
    ).toBe(true);
  });

  it("opens chest regions when loading ?tab=library&group=CHEST", () => {
    expect(viewFromUrlSearch("tab=library&group=CHEST")).toBe("region-picker");
  });

  it("opens the filtered list when a chest region is selected", () => {
    expect(
      resolveMemberLibraryView({
        activeGroup: "CHEST",
        activeRegion: "UPPER",
        browseAllInGroup: false,
        debouncedQuery: "",
      }),
    ).toBe("exercise-list");
    expect(viewFromUrlSearch("tab=library&group=CHEST&region=upper")).toBe(
      "exercise-list",
    );
  });

  it("supports browse-all chest without a sub-region", () => {
    expect(
      resolveMemberLibraryView({
        activeGroup: "CHEST",
        activeRegion: null,
        browseAllInGroup: true,
        debouncedQuery: "",
      }),
    ).toBe("exercise-list");
    expect(viewFromUrlSearch("tab=library&group=CHEST&chestAll=1")).toBe(
      "exercise-list",
    );
  });

  it("returns to chest regions after back from a region list", () => {
    const afterBack = resolveMemberLibraryView({
      activeGroup: "CHEST",
      activeRegion: null,
      browseAllInGroup: false,
      debouncedQuery: "",
    });
    expect(afterBack).toBe("region-picker");
  });

  it("returns to muscle groups after back from chest regions", () => {
    expect(
      resolveMemberLibraryView({
        activeGroup: null,
        activeRegion: null,
        browseAllInGroup: false,
        debouncedQuery: "",
      }),
    ).toBe("muscle-groups");
  });

  it("opens back region picker when browsing back", () => {
    expect(viewFromUrlSearch("tab=library&group=BACK")).toBe("region-picker");
    expect(
      resolveMemberLibraryView({
        activeGroup: "BACK",
        activeRegion: "lats",
        browseAllInGroup: false,
        debouncedQuery: "",
      }),
    ).toBe("exercise-list");
    expect(viewFromUrlSearch("tab=library&group=BACK&region=lats")).toBe(
      "exercise-list",
    );
    expect(viewFromUrlSearch("tab=library&group=BACK&backAll=1")).toBe(
      "exercise-list",
    );
  });

  it("opens shoulders region picker when browsing shoulders", () => {
    expect(viewFromUrlSearch("tab=library&group=SHOULDERS")).toBe(
      "region-picker",
    );
  });

  it("opens the arms region picker and region lists", () => {
    expect(viewFromUrlSearch("tab=library&group=ARMS")).toBe("region-picker");
    expect(viewFromUrlSearch("tab=library&group=ARMS&region=triceps")).toBe(
      "exercise-list",
    );
    expect(viewFromUrlSearch("tab=library&group=ARMS&armsAll=1")).toBe(
      "exercise-list",
    );
  });

  it("opens the legs region picker, a region list, and browse all", () => {
    expect(viewFromUrlSearch("tab=library&group=LEGS")).toBe("region-picker");
    expect(viewFromUrlSearch("tab=library&group=LEGS&region=quadriceps")).toBe(
      "exercise-list",
    );
    expect(viewFromUrlSearch("tab=library&group=LEGS&legsAll=1")).toBe(
      "exercise-list",
    );
  });

  it("opens the core region picker, a region list, and browse all", () => {
    expect(viewFromUrlSearch("tab=library&group=CORE")).toBe("region-picker");
    expect(viewFromUrlSearch("tab=library&group=CORE&region=front-abs")).toBe(
      "exercise-list",
    );
    expect(viewFromUrlSearch("tab=library&group=CORE&coreAll=1")).toBe(
      "exercise-list",
    );
  });
});
