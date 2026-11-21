import type { MemberLibraryMuscleFilter } from "@/lib/member-portal/member-library-muscle-groups";
import {
  memberLibraryRegionModule,
  type MemberMuscleGroupRegionModule,
} from "@/lib/member-portal/muscle-region-registry";
import type { MuscleGroup } from "@/lib/muscle-groups";

export function memberLibraryRegionPrimarySlug(
  module: MemberMuscleGroupRegionModule,
  regionId: string,
): string | null {
  const row = module.regions.find((r) => r.id === regionId);
  return row?.primaryMuscleSlug ?? null;
}

export function exerciseMatchesMemberLibraryRegion(input: {
  muscleGroup: MuscleGroup;
  exerciseName: string;
  primaryMuscles: readonly string[];
  libraryGroup: MemberLibraryMuscleFilter;
  regionId: string;
}): boolean {
  const module = memberLibraryRegionModule(input.libraryGroup);
  if (!module || module.group !== input.muscleGroup) return false;
  const slug = memberLibraryRegionPrimarySlug(module, input.regionId);
  if (slug) {
    return input.primaryMuscles.includes(slug);
  }
  return module.classifyExerciseName(input.exerciseName) === input.regionId;
}

export function memberLibraryRegionLabel(
  group: MemberLibraryMuscleFilter,
  regionId: string,
): string {
  const module = memberLibraryRegionModule(group);
  return module?.regionLabel(regionId) ?? regionId;
}

export function parseMemberLibraryRegionForGroup(
  group: MemberLibraryMuscleFilter | null | undefined,
  value: string | null | undefined,
): string | null {
  if (!group) return null;
  return memberLibraryRegionModule(group)?.parseRegion(value) ?? null;
}

export function memberLibraryRegionBrowseAllFromUrl(
  group: MemberLibraryMuscleFilter | null | undefined,
  params: URLSearchParams,
): boolean {
  const module = memberLibraryRegionModule(group);
  if (!module) return false;
  return params.get(module.browseAllQueryKey) === "1";
}