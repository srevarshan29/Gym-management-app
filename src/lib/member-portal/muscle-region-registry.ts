import type { MemberLibraryMuscleFilter } from "@/lib/member-portal/member-library-muscle-groups";
import {
  BACK_BROWSE_ALL_LABEL,
  BACK_MUSCLE_REGION_CONFIG,
  BACK_REGION_PICKER_SUBTITLE,
  BACK_REGION_PICKER_TITLE,
  backRegionQueryValue,
  memberLibraryBackRegionLabel,
  parseMemberLibraryBackRegion,
  type BackMuscleRegion,
} from "@/lib/member-portal/muscle-regions/back";
import {
  CHEST_BROWSE_ALL_LABEL,
  CHEST_MUSCLE_REGION_CONFIG,
  CHEST_REGION_PICKER_SUBTITLE,
  CHEST_REGION_PICKER_TITLE,
  chestRegionQueryValue,
  classifyChestMuscleRegion,
  memberLibraryChestRegionLabel,
  parseMemberLibraryChestRegion,
  type ChestMuscleRegion,
} from "@/lib/member-portal/muscle-regions/chest";
import {
  ARM_BROWSE_ALL_LABEL,
  ARM_MUSCLE_REGION_CONFIG,
  ARM_REGION_PICKER_SUBTITLE,
  ARM_REGION_PICKER_TITLE,
  armRegionQueryValue,
  memberLibraryArmRegionLabel,
  parseMemberLibraryArmRegion,
  type ArmMuscleRegion,
} from "@/lib/member-portal/muscle-regions/arms";
import {
  CORE_BROWSE_ALL_LABEL,
  CORE_MUSCLE_REGION_CONFIG,
  CORE_REGION_PICKER_SUBTITLE,
  CORE_REGION_PICKER_TITLE,
  coreRegionQueryValue,
  memberLibraryCoreRegionLabel,
  parseMemberLibraryCoreRegion,
  type CoreMuscleRegion,
} from "@/lib/member-portal/muscle-regions/core";
import {
  LEG_BROWSE_ALL_LABEL,
  LEG_MUSCLE_REGION_CONFIG,
  LEG_REGION_PICKER_SUBTITLE,
  LEG_REGION_PICKER_TITLE,
  legRegionQueryValue,
  memberLibraryLegRegionLabel,
  parseMemberLibraryLegRegion,
  type LegMuscleRegion,
} from "@/lib/member-portal/muscle-regions/legs";
import {
  SHOULDER_BROWSE_ALL_LABEL,
  SHOULDER_MUSCLE_REGION_CONFIG,
  SHOULDER_REGION_PICKER_SUBTITLE,
  SHOULDER_REGION_PICKER_TITLE,
  memberLibraryShoulderRegionLabel,
  parseMemberLibraryShoulderRegion,
  shoulderRegionQueryValue,
  type ShoulderMuscleRegion,
} from "@/lib/member-portal/muscle-regions/shoulders";

export type MemberMuscleRegionConfig = {
  id: string;
  label: string;
  subtitle: string;
  imageSrc: string;
  /** When set, region browse matches catalog `primaryMuscles` only. */
  primaryMuscleSlug?: string;
};

export type MemberMuscleGroupRegionModule = {
  group: MemberLibraryMuscleFilter;
  pickerTitle: string;
  pickerSubtitle: string;
  browseAllLabel: string;
  /** Query param used when browsing the whole group (e.g. chestAll=1). */
  browseAllQueryKey: string;
  regions: MemberMuscleRegionConfig[];
  parseRegion: (value: string | null | undefined) => string | null;
  regionQueryValue: (region: string) => string;
  regionLabel: (region: string) => string;
  classifyExerciseName: (name: string) => string;
};

const CHEST_REGION_MODULE: MemberMuscleGroupRegionModule = {
  group: "CHEST",
  pickerTitle: CHEST_REGION_PICKER_TITLE,
  pickerSubtitle: CHEST_REGION_PICKER_SUBTITLE,
  browseAllLabel: CHEST_BROWSE_ALL_LABEL,
  browseAllQueryKey: "chestAll",
  regions: [...CHEST_MUSCLE_REGION_CONFIG],
  parseRegion: parseMemberLibraryChestRegion,
  regionQueryValue: (region) =>
    chestRegionQueryValue(region as ChestMuscleRegion),
  regionLabel: (region) =>
    memberLibraryChestRegionLabel(region as ChestMuscleRegion),
  classifyExerciseName: classifyChestMuscleRegion,
};

const BACK_REGION_MODULE: MemberMuscleGroupRegionModule = {
  group: "BACK",
  pickerTitle: BACK_REGION_PICKER_TITLE,
  pickerSubtitle: BACK_REGION_PICKER_SUBTITLE,
  browseAllLabel: BACK_BROWSE_ALL_LABEL,
  browseAllQueryKey: "backAll",
  regions: BACK_MUSCLE_REGION_CONFIG.map((row) => ({ ...row })),
  parseRegion: parseMemberLibraryBackRegion,
  regionQueryValue: (region) => backRegionQueryValue(region as BackMuscleRegion),
  regionLabel: (region) =>
    memberLibraryBackRegionLabel(region as BackMuscleRegion),
  classifyExerciseName: () => "",
};

const SHOULDER_REGION_MODULE: MemberMuscleGroupRegionModule = {
  group: "SHOULDERS",
  pickerTitle: SHOULDER_REGION_PICKER_TITLE,
  pickerSubtitle: SHOULDER_REGION_PICKER_SUBTITLE,
  browseAllLabel: SHOULDER_BROWSE_ALL_LABEL,
  browseAllQueryKey: "shouldersAll",
  regions: SHOULDER_MUSCLE_REGION_CONFIG.map((row) => ({ ...row })),
  parseRegion: parseMemberLibraryShoulderRegion,
  regionQueryValue: (region) =>
    shoulderRegionQueryValue(region as ShoulderMuscleRegion),
  regionLabel: (region) =>
    memberLibraryShoulderRegionLabel(region as ShoulderMuscleRegion),
  classifyExerciseName: () => "",
};

const ARM_REGION_MODULE: MemberMuscleGroupRegionModule = {
  group: "ARMS",
  pickerTitle: ARM_REGION_PICKER_TITLE,
  pickerSubtitle: ARM_REGION_PICKER_SUBTITLE,
  browseAllLabel: ARM_BROWSE_ALL_LABEL,
  browseAllQueryKey: "armsAll",
  regions: ARM_MUSCLE_REGION_CONFIG.map((row) => ({ ...row })),
  parseRegion: parseMemberLibraryArmRegion,
  regionQueryValue: (region) => armRegionQueryValue(region as ArmMuscleRegion),
  regionLabel: (region) =>
    memberLibraryArmRegionLabel(region as ArmMuscleRegion),
  classifyExerciseName: () => "",
};

const LEG_REGION_MODULE: MemberMuscleGroupRegionModule = {
  group: "LEGS",
  pickerTitle: LEG_REGION_PICKER_TITLE,
  pickerSubtitle: LEG_REGION_PICKER_SUBTITLE,
  browseAllLabel: LEG_BROWSE_ALL_LABEL,
  browseAllQueryKey: "legsAll",
  regions: LEG_MUSCLE_REGION_CONFIG.map((row) => ({ ...row })),
  parseRegion: parseMemberLibraryLegRegion,
  regionQueryValue: (region) => legRegionQueryValue(region as LegMuscleRegion),
  regionLabel: (region) =>
    memberLibraryLegRegionLabel(region as LegMuscleRegion),
  classifyExerciseName: () => "",
};

const CORE_REGION_MODULE: MemberMuscleGroupRegionModule = {
  group: "CORE",
  pickerTitle: CORE_REGION_PICKER_TITLE,
  pickerSubtitle: CORE_REGION_PICKER_SUBTITLE,
  browseAllLabel: CORE_BROWSE_ALL_LABEL,
  browseAllQueryKey: "coreAll",
  regions: CORE_MUSCLE_REGION_CONFIG.map((row) => ({ ...row })),
  parseRegion: parseMemberLibraryCoreRegion,
  regionQueryValue: (region) => coreRegionQueryValue(region as CoreMuscleRegion),
  regionLabel: (region) =>
    memberLibraryCoreRegionLabel(region as CoreMuscleRegion),
  classifyExerciseName: () => "",
};

const REGION_MODULES: Partial<
  Record<MemberLibraryMuscleFilter, MemberMuscleGroupRegionModule>
> = {
  CHEST: CHEST_REGION_MODULE,
  BACK: BACK_REGION_MODULE,
  SHOULDERS: SHOULDER_REGION_MODULE,
  ARMS: ARM_REGION_MODULE,
  LEGS: LEG_REGION_MODULE,
  CORE: CORE_REGION_MODULE,
};

export function memberLibraryRegionModule(
  group: MemberLibraryMuscleFilter | null | undefined,
): MemberMuscleGroupRegionModule | null {
  if (!group) return null;
  return REGION_MODULES[group] ?? null;
}

export function memberLibraryGroupsWithRegions(): MemberLibraryMuscleFilter[] {
  return Object.keys(REGION_MODULES) as MemberLibraryMuscleFilter[];
}

export function memberLibraryRegionIds(
  group: MemberLibraryMuscleFilter,
): string[] {
  return memberLibraryRegionModule(group)?.regions.map((r) => r.id) ?? [];
}

export function isMemberLibraryRegionId(
  group: MemberLibraryMuscleFilter,
  regionId: string,
): boolean {
  return memberLibraryRegionIds(group).includes(regionId);
}

export function shouldShowMemberLibraryRegionPicker(input: {
  activeGroup: MemberLibraryMuscleFilter | null;
  activeRegion: string | null;
  browseAllInGroup: boolean;
  debouncedQuery: string;
}): boolean {
  const module = memberLibraryRegionModule(input.activeGroup);
  if (!module) return false;
  return (
    !input.activeRegion &&
    !input.browseAllInGroup &&
    input.debouncedQuery.length === 0
  );
}

export function classifyMemberLibraryRegionForExercise(
  group: MemberLibraryMuscleFilter,
  exerciseName: string,
): string | null {
  const module = memberLibraryRegionModule(group);
  if (!module) return null;
  const byName = module.classifyExerciseName(exerciseName);
  if (byName) return byName;
  return null;
}

/** @deprecated Use memberLibraryRegionModule — retained for tests migrating from chest-only API. */
export const CHEST_MEMBER_REGION_MODULE = CHEST_REGION_MODULE;