import { describe, expect, it } from "vitest";

import {
  deriveMemberLibraryListLoad,
  memberLibraryListLoadKey,
  shouldApplyMemberLibraryBrowseResult,
  shouldClearMemberLibraryBrowseLoading,
} from "@/lib/member-portal/member-library-list-load";
import { memberLibraryFilterToCatalogBrowseQuery } from "@/lib/member-portal/member-library-muscle-groups";

describe("member exercise library list load stability", () => {
  it("documents that browse query objects are not referentially stable", () => {
    const a = memberLibraryFilterToCatalogBrowseQuery("CARDIO");
    const b = memberLibraryFilterToCatalogBrowseQuery("CARDIO");
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });

  it("keeps CARDIO and BACK list load keys stable across simulated renders", () => {
    for (const group of ["CARDIO", "BACK"] as const) {
      const keys = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const { params } = deriveMemberLibraryListLoad({
          activeGroup: group,
          activeRegion: null,
          browseAllInGroup: false,
          debouncedQuery: "",
        });
        expect(params.catalogCardio).toBe(group === "CARDIO");
        keys.add(memberLibraryListLoadKey(params));
      }
      expect(keys.size).toBe(1);
    }
  });

  it("changes load key only when filters or search change", () => {
    const cardio = deriveMemberLibraryListLoad({
      activeGroup: "CARDIO",
      activeRegion: null,
      browseAllInGroup: false,
      debouncedQuery: "",
    });
    const cardioSearch = deriveMemberLibraryListLoad({
      activeGroup: "CARDIO",
      activeRegion: null,
      browseAllInGroup: false,
      debouncedQuery: "run",
    });
    const back = deriveMemberLibraryListLoad({
      activeGroup: "BACK",
      activeRegion: null,
      browseAllInGroup: false,
      debouncedQuery: "",
    });

    expect(memberLibraryListLoadKey(cardio.params)).not.toBe(
      memberLibraryListLoadKey(back.params),
    );
    expect(memberLibraryListLoadKey(cardio.params)).not.toBe(
      memberLibraryListLoadKey(cardioSearch.params),
    );
  });

  it("does not load list on region picker views", () => {
    for (const group of ["CHEST", "BACK", "SHOULDERS", "ARMS", "LEGS", "CORE"] as const) {
      const picker = deriveMemberLibraryListLoad({
        activeGroup: group,
        activeRegion: null,
        browseAllInGroup: false,
        debouncedQuery: "",
      });
      expect(picker.shouldLoadList).toBe(false);
    }
  });

  it("clears loading only for the latest browse sequence", () => {
    expect(shouldClearMemberLibraryBrowseLoading(1, 2)).toBe(false);
    expect(shouldClearMemberLibraryBrowseLoading(2, 2)).toBe(true);
    expect(shouldApplyMemberLibraryBrowseResult(1, 2)).toBe(false);
    expect(shouldApplyMemberLibraryBrowseResult(2, 2)).toBe(true);
  });
});