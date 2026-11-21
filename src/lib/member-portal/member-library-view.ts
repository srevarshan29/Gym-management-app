import type { ChestMuscleRegion } from "@/lib/member-portal/muscle-regions/chest";
import type { MemberLibraryMuscleFilter } from "@/lib/member-portal/member-library-muscle-groups";
import {
  memberLibraryRegionModule,
  shouldShowMemberLibraryRegionPicker,
} from "@/lib/member-portal/muscle-region-registry";

export type MemberLibraryView =
  | "muscle-groups"
  | "region-picker"
  | "exercise-list";

/** @deprecated Use `region-picker` — alias for existing tests and transitions. */
export type MemberLibraryViewLegacy = MemberLibraryView | "chest-regions";

export type MemberLibraryBrowseInput = {
  activeGroup: MemberLibraryMuscleFilter | null;
  activeRegion: string | null;
  browseAllInGroup: boolean;
  debouncedQuery: string;
};

/** Accepts legacy chest field names for gradual migration. */
export function normalizeMemberLibraryBrowseInput(input: {
  activeGroup: MemberLibraryMuscleFilter | null;
  activeRegion?: string | null;
  browseAllInGroup?: boolean;
  activeChestRegion?: ChestMuscleRegion | null;
  chestBrowseAll?: boolean;
  debouncedQuery: string;
}): MemberLibraryBrowseInput {
  const activeRegion =
    input.activeRegion ??
    (input.activeGroup === "CHEST" ? input.activeChestRegion ?? null : null);
  const browseAllInGroup =
    input.browseAllInGroup ?? input.chestBrowseAll ?? false;
  return {
    activeGroup: input.activeGroup,
    activeRegion: activeRegion ?? null,
    browseAllInGroup,
    debouncedQuery: input.debouncedQuery,
  };
}

export function resolveMemberLibraryBrowseRegion(
  input: MemberLibraryBrowseInput,
): Pick<MemberLibraryBrowseInput, "activeRegion" | "browseAllInGroup"> {
  if (!memberLibraryRegionModule(input.activeGroup)) {
    return { activeRegion: null, browseAllInGroup: false };
  }
  return {
    activeRegion: input.activeRegion,
    browseAllInGroup: input.browseAllInGroup,
  };
}

export function isMemberLibraryRegionPicker(
  input: Parameters<typeof normalizeMemberLibraryBrowseInput>[0],
): boolean {
  const normalized = normalizeMemberLibraryBrowseInput(input);
  const { activeRegion, browseAllInGroup } =
    resolveMemberLibraryBrowseRegion(normalized);
  return shouldShowMemberLibraryRegionPicker({
    activeGroup: normalized.activeGroup,
    activeRegion,
    browseAllInGroup,
    debouncedQuery: normalized.debouncedQuery,
  });
}

/** @deprecated Use `isMemberLibraryRegionPicker`. */
export const isChestRegionPicker = isMemberLibraryRegionPicker;

export function resolveMemberLibraryView(
  input: Parameters<typeof normalizeMemberLibraryBrowseInput>[0],
): MemberLibraryView {
  const normalized = normalizeMemberLibraryBrowseInput(input);
  if (isMemberLibraryRegionPicker(input)) {
    return "region-picker";
  }
  if (normalized.debouncedQuery.length > 0 || normalized.activeGroup !== null) {
    return "exercise-list";
  }
  return "muscle-groups";
}