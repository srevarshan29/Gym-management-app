export const ARM_MUSCLE_REGIONS = [
  "biceps",
  "brachialis",
  "triceps",
  "brachioradialis",
] as const;
export type ArmMuscleRegion = (typeof ARM_MUSCLE_REGIONS)[number];

export const ARM_MUSCLE_REGION_CONFIG = [
  {
    id: "biceps",
    label: "Biceps",
    subtitle: "Curls & supinated pulls",
    imageSrc: "/images/muscle-groups/regions/Arms/Biceps.jpeg",
    primaryMuscleSlug: "biceps_brachii",
  },
  {
    id: "brachialis",
    label: "Brachialis",
    subtitle: "Hammer curls & reverse curls",
    imageSrc: "/images/muscle-groups/regions/Arms/Brachialis.jpeg",
    primaryMuscleSlug: "brachialis",
  },
  {
    id: "triceps",
    label: "Triceps",
    subtitle: "Extensions, pushdowns & dips",
    imageSrc: "/images/muscle-groups/regions/Arms/tricep.jpeg",
    primaryMuscleSlug: "triceps_brachii",
  },
  {
    id: "brachioradialis",
    label: "Brachioradialis",
    subtitle: "Hammer curls for the forearm",
    imageSrc: "/images/muscle-groups/regions/Arms/Brachioradialis.jpeg",
    primaryMuscleSlug: "brachioradialis",
  },
] as const;

export const ARM_REGION_PICKER_TITLE = "Arms";
export const ARM_REGION_PICKER_SUBTITLE =
  "Choose an arm muscle to browse.";
export const ARM_BROWSE_ALL_LABEL = "Browse all arm exercises";

export function parseMemberLibraryArmRegion(
  value: string | null | undefined,
): ArmMuscleRegion | null {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;
  return (ARM_MUSCLE_REGIONS as readonly string[]).includes(normalized)
    ? (normalized as ArmMuscleRegion)
    : null;
}

export function armRegionQueryValue(region: ArmMuscleRegion): string {
  return region;
}

export function memberLibraryArmRegionLabel(region: ArmMuscleRegion): string {
  return ARM_MUSCLE_REGION_CONFIG.find((row) => row.id === region)?.label ?? region;
}
