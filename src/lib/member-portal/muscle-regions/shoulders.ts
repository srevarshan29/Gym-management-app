export const SHOULDER_MUSCLE_REGIONS = [
  "front-delts",
  "side-delts",
  "rear-delts",
] as const;
export type ShoulderMuscleRegion = (typeof SHOULDER_MUSCLE_REGIONS)[number];

export const SHOULDER_MUSCLE_REGION_CONFIG = [
  {
    id: "front-delts",
    label: "Front Delts",
    subtitle: "Presses & front raises",
    imageSrc: "/images/muscle-groups/regions/shoulders/front-delts.jpeg",
    primaryMuscleSlug: "anterior_deltoid",
  },
  {
    id: "side-delts",
    label: "Side Delts",
    subtitle: "Lateral raises & upright rows",
    imageSrc: "/images/muscle-groups/regions/shoulders/side-delts.jpeg",
    primaryMuscleSlug: "lateral_deltoid",
  },
  {
    id: "rear-delts",
    label: "Rear Delts",
    subtitle: "Reverse flies & face pulls",
    imageSrc: "/images/muscle-groups/regions/shoulders/rear-delts.jpeg",
    primaryMuscleSlug: "posterior_deltoid",
  },
] as const;

export const SHOULDER_REGION_PICKER_TITLE = "Shoulders";
export const SHOULDER_REGION_PICKER_SUBTITLE =
  "Choose a delt head to browse.";
export const SHOULDER_BROWSE_ALL_LABEL = "Browse all shoulder exercises";

export function parseMemberLibraryShoulderRegion(
  value: string | null | undefined,
): ShoulderMuscleRegion | null {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;
  return (SHOULDER_MUSCLE_REGIONS as readonly string[]).includes(normalized)
    ? (normalized as ShoulderMuscleRegion)
    : null;
}

export function shoulderRegionQueryValue(
  region: ShoulderMuscleRegion,
): string {
  return region;
}

export function memberLibraryShoulderRegionLabel(
  region: ShoulderMuscleRegion,
): string {
  return (
    SHOULDER_MUSCLE_REGION_CONFIG.find((r) => r.id === region)?.label ?? region
  );
}