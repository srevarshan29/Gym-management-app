export const CORE_MUSCLE_REGIONS = [
  "front-abs",
  "side-abs",
  "deep-core",
  "lower-back",
] as const;
export type CoreMuscleRegion = (typeof CORE_MUSCLE_REGIONS)[number];

export const CORE_MUSCLE_REGION_CONFIG = [
  {
    id: "front-abs",
    label: "Front Abs",
    subtitle: "Crunches, sit-ups & leg raises",
    imageSrc: "/images/muscle-groups/regions/core/front%20Abs.jpeg",
    primaryMuscleSlug: "rectus_abdominis",
  },
  {
    id: "side-abs",
    label: "Side Abs",
    subtitle: "Twists, side bends & side planks",
    imageSrc: "/images/muscle-groups/regions/core/side%20Abs.jpeg",
    primaryMuscleSlug: "obliques",
  },
  {
    id: "deep-core",
    label: "Deep Core",
    subtitle: "Planks, dead bugs & rollouts",
    imageSrc: "/images/muscle-groups/regions/core/Deep%20core.jpeg",
    primaryMuscleSlug: "transverse_abdominis",
  },
  {
    id: "lower-back",
    label: "Lower Back",
    subtitle: "Extensions & spinal stability",
    imageSrc: "/images/muscle-groups/regions/core/lower%20back.jpeg",
    primaryMuscleSlug: "erector_spinae",
  },
] as const;

export const CORE_REGION_PICKER_TITLE = "Core";
export const CORE_REGION_PICKER_SUBTITLE = "Choose a core area to browse.";
export const CORE_BROWSE_ALL_LABEL = "Browse all core exercises";

export function parseMemberLibraryCoreRegion(
  value: string | null | undefined,
): CoreMuscleRegion | null {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;
  return (CORE_MUSCLE_REGIONS as readonly string[]).includes(normalized)
    ? (normalized as CoreMuscleRegion)
    : null;
}

export function coreRegionQueryValue(region: CoreMuscleRegion): string {
  return region;
}

export function memberLibraryCoreRegionLabel(region: CoreMuscleRegion): string {
  return (
    CORE_MUSCLE_REGION_CONFIG.find((row) => row.id === region)?.label ?? region
  );
}
