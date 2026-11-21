export const BACK_MUSCLE_REGIONS = [
  "lats",
  "spinal-erectors",
  "trapezius",
] as const;
export type BackMuscleRegion = (typeof BACK_MUSCLE_REGIONS)[number];

export const BACK_MUSCLE_REGION_CONFIG = [
  {
    id: "lats",
    label: "Lats",
    subtitle: "Pulls, pulldowns & rows",
    imageSrc: "/images/muscle-groups/regions/back/lats.png",
    primaryMuscleSlug: "latissimus_dorsi",
  },
  {
    id: "spinal-erectors",
    label: "Spinal Erectors",
    subtitle: "Extensions & lower-back work",
    imageSrc: "/images/muscle-groups/regions/back/spinal-erectors.png",
    primaryMuscleSlug: "erector_spinae",
  },
  {
    id: "trapezius",
    label: "Trapezius",
    subtitle: "Shrugs, scapular pulls & upper-back rows",
    imageSrc: "/images/muscle-groups/regions/back/upper-trapezius.png",
    primaryMuscleSlug: "trapezius",
  },
] as const;

export const BACK_REGION_PICKER_TITLE = "Back";
export const BACK_REGION_PICKER_SUBTITLE =
  "Choose an area of the back to browse.";
export const BACK_BROWSE_ALL_LABEL = "Browse all back exercises";

const REGION_BY_QUERY = new Map(
  BACK_MUSCLE_REGION_CONFIG.flatMap((row) => [
    [row.id, row.id],
    [row.id.replace(/-/g, "_"), row.id],
  ]),
);

export function parseMemberLibraryBackRegion(
  value: string | null | undefined,
): BackMuscleRegion | null {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;
  const resolved = REGION_BY_QUERY.get(normalized) ?? normalized;
  return (BACK_MUSCLE_REGIONS as readonly string[]).includes(resolved)
    ? (resolved as BackMuscleRegion)
    : null;
}

export function backRegionQueryValue(region: BackMuscleRegion): string {
  return region;
}

export function memberLibraryBackRegionLabel(region: BackMuscleRegion): string {
  return (
    BACK_MUSCLE_REGION_CONFIG.find((r) => r.id === region)?.label ?? region
  );
}