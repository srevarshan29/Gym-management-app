import {
  memberLibraryFilterToCatalogBrowseQuery,
  type MemberLibraryMuscleFilter,
} from "@/lib/member-portal/member-library-muscle-groups";
import { memberLibraryRegionModule } from "@/lib/member-portal/muscle-region-registry";
import { normalizeMemberLibraryBrowseInput } from "@/lib/member-portal/member-library-view";
import { resolveMemberLibraryView } from "@/lib/member-portal/member-library-view";
import type { MuscleGroup } from "@/lib/muscle-groups";
import type { MemberCatalogListItem } from "@/lib/workout-tracking/member-catalog-exercises";

/** Primitive browse parameters for member library list loads (stable across renders). */
export type MemberLibraryListLoadParams = {
  debouncedQuery: string;
  catalogMuscleGroup: MuscleGroup | null;
  catalogFullBody: boolean;
  catalogCardio: boolean;
  libraryGroup: MemberLibraryMuscleFilter | null;
  libraryRegion: string | null;
};

export function deriveMemberLibraryListLoad(
  input: Parameters<typeof normalizeMemberLibraryBrowseInput>[0],
): { shouldLoadList: boolean; params: MemberLibraryListLoadParams } {
  const normalized = normalizeMemberLibraryBrowseInput(input);
  const shouldLoadList =
    resolveMemberLibraryView(input) === "exercise-list";

  const { muscleGroup, fullBody, cardio } =
    memberLibraryFilterToCatalogBrowseQuery(normalized.activeGroup);

  const hasModule = Boolean(
    memberLibraryRegionModule(normalized.activeGroup),
  );
  const libraryRegion =
    hasModule && normalized.activeRegion ? normalized.activeRegion : null;

  return {
    shouldLoadList,
    params: {
      debouncedQuery: normalized.debouncedQuery,
      catalogMuscleGroup: muscleGroup,
      catalogFullBody: fullBody,
      catalogCardio: cardio,
      libraryGroup: normalized.activeGroup,
      libraryRegion,
    },
  };
}

export function memberLibraryListLoadKey(
  params: MemberLibraryListLoadParams,
): string {
  return JSON.stringify(params);
}

export function shouldApplyMemberLibraryBrowseResult(
  requestSeq: number,
  currentSeq: number,
): boolean {
  return requestSeq === currentSeq;
}

export function shouldClearMemberLibraryBrowseLoading(
  requestSeq: number,
  currentSeq: number,
): boolean {
  return requestSeq === currentSeq;
}

/** Appends catalog rows without duplicate catalogIds; preserves order. */
export function appendMemberLibraryBrowseItems(
  previous: MemberCatalogListItem[],
  incoming: MemberCatalogListItem[],
): MemberCatalogListItem[] {
  if (incoming.length === 0) return previous;
  const seen = new Set(previous.map((row) => row.catalogId));
  const next = [...previous];
  for (const item of incoming) {
    if (seen.has(item.catalogId)) continue;
    seen.add(item.catalogId);
    next.push(item);
  }
  return next;
}