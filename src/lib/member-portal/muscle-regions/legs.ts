export const LEG_MUSCLE_REGIONS = [
  "quadriceps",
  "hamstrings",
  "glutes",
  "calves",
] as const;
export type LegMuscleRegion = (typeof LEG_MUSCLE_REGIONS)[number];

export const LEG_MUSCLE_REGION_CONFIG = [
  {
    id: "quadriceps",
    label: "Quadriceps",
    subtitle: "Squats, lunges & extensions",
    imageSrc: "/images/muscle-groups/regions/legs/Quadriceps.jpeg",
    primaryMuscleSlug: "quadriceps",
  },
  {
    id: "hamstrings",
    label: "Hamstrings",
    subtitle: "Curls, hinges & RDLs",
    imageSrc: "/images/muscle-groups/regions/legs/hamstrings.jpeg",
    primaryMuscleSlug: "hamstrings",
  },
  {
    id: "glutes",
    label: "Glutes",
    subtitle: "Hip thrusts, bridges & hinges",
    imageSrc: "/images/muscle-groups/regions/legs/Glutes.jpeg",
    primaryMuscleSlug: "gluteus_maximus",
  },
  {
    id: "calves",
    label: "Calves",
    subtitle: "Raises & calf stretches",
    imageSrc: "/images/muscle-groups/regions/legs/Calves.jpeg",
    primaryMuscleSlug: "gastrocnemius",
  },
] as const;

export const LEG_REGION_PICKER_TITLE = "Legs";
export const LEG_REGION_PICKER_SUBTITLE = "Choose a leg muscle to browse.";
export const LEG_BROWSE_ALL_LABEL = "Browse all leg exercises";

export function parseMemberLibraryLegRegion(
  value: string | null | undefined,
): LegMuscleRegion | null {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;
  return (LEG_MUSCLE_REGIONS as readonly string[]).includes(normalized)
    ? (normalized as LegMuscleRegion)
    : null;
}

export function legRegionQueryValue(region: LegMuscleRegion): string {
  return region;
}

export function memberLibraryLegRegionLabel(region: LegMuscleRegion): string {
  return LEG_MUSCLE_REGION_CONFIG.find((row) => row.id === region)?.label ?? region;
}
