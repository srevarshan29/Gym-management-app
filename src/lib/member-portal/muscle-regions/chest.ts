/** Chest sub-regions for member exercise library browse (catalog muscleGroup stays CHEST). */
export type ChestMuscleRegion = "UPPER" | "MID" | "LOWER";

export const CHEST_MUSCLE_REGIONS = [
  "UPPER",
  "MID",
  "LOWER",
] as const satisfies readonly ChestMuscleRegion[];

export type ChestMuscleRegionConfig = {
  id: ChestMuscleRegion;
  label: string;
  subtitle: string;
  imageSrc: string;
};

export const CHEST_MUSCLE_REGION_CONFIG: ChestMuscleRegionConfig[] = [
  {
    id: "UPPER",
    label: "Upper Chest",
    subtitle: "Incline presses & flies",
    imageSrc: "/images/muscle-groups/regions/chest/upper-chest.png",
  },
  {
    id: "MID",
    label: "Mid Chest",
    subtitle: "Flat presses & flies",
    imageSrc: "/images/muscle-groups/regions/chest/mid-chest.png",
  },
  {
    id: "LOWER",
    label: "Lower Chest",
    subtitle: "Declines & dips",
    imageSrc: "/images/muscle-groups/regions/chest/lower-chest.png",
  },
];

const UPPER_NAME = /\bincline\b/i;
const LOWER_NAME =
  /\bdecline\b|\bchest dip|\bring dip|\bstraight bar dip|\bweighted dip/i;

export function classifyChestMuscleRegion(name: string): ChestMuscleRegion {
  const trimmed = name.trim();
  if (!trimmed) return "MID";
  if (UPPER_NAME.test(trimmed)) return "UPPER";
  if (LOWER_NAME.test(trimmed)) return "LOWER";
  return "MID";
}

export function parseMemberLibraryChestRegion(
  value: string | null | undefined,
): ChestMuscleRegion | null {
  const normalized = value?.trim().toUpperCase();
  if (!normalized) return null;
  if (normalized === "UPPER" || normalized === "UP") return "UPPER";
  if (normalized === "MID" || normalized === "MIDDLE") return "MID";
  if (normalized === "LOWER" || normalized === "LOW") return "LOWER";
  return (CHEST_MUSCLE_REGIONS as readonly string[]).includes(normalized)
    ? (normalized as ChestMuscleRegion)
    : null;
}

export function memberLibraryChestRegionLabel(
  region: ChestMuscleRegion,
): string {
  return (
    CHEST_MUSCLE_REGION_CONFIG.find((r) => r.id === region)?.label ?? region
  );
}

export function chestRegionQueryValue(region: ChestMuscleRegion): string {
  return region.toLowerCase();
}

export const CHEST_REGION_PICKER_TITLE = "Chest";
export const CHEST_REGION_PICKER_SUBTITLE =
  "Choose an area of the chest to browse.";
export const CHEST_BROWSE_ALL_LABEL = "Browse all chest exercises";