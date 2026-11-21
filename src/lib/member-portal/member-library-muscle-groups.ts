import type { MuscleGroup } from "@/lib/muscle-groups";

/** Member library browse filters (Full Body / Cardio are tag-based, not muscle groups). */
export type MemberLibraryMuscleFilter =
  | "CHEST"
  | "BACK"
  | "SHOULDERS"
  | "ARMS"
  | "LEGS"
  | "CORE"
  | "FULL_BODY"
  | "CARDIO";

export const MEMBER_LIBRARY_MUSCLE_FILTERS = [
  "CHEST",
  "BACK",
  "SHOULDERS",
  "ARMS",
  "LEGS",
  "CORE",
  "FULL_BODY",
  "CARDIO",
] as const satisfies readonly MemberLibraryMuscleFilter[];

export type MemberLibraryMuscleGroupConfig = {
  id: MemberLibraryMuscleFilter;
  label: string;
  subtitle: string;
};

export const MEMBER_LIBRARY_MUSCLE_GROUPS: MemberLibraryMuscleGroupConfig[] = [
  {
    id: "CHEST",
    label: "Chest",
    subtitle: "Press & fly movements",
  },
  {
    id: "BACK",
    label: "Back",
    subtitle: "Pulls & rows",
  },
  {
    id: "SHOULDERS",
    label: "Shoulders",
    subtitle: "Press & raises",
  },
  {
    id: "ARMS",
    label: "Arms",
    subtitle: "Biceps & triceps",
  },
  {
    id: "LEGS",
    label: "Legs",
    subtitle: "Squats & hinges",
  },
  {
    id: "CORE",
    label: "Core",
    subtitle: "Abs & stability",
  },
  {
    id: "FULL_BODY",
    label: "Full Body",
    subtitle: "Compound lifts",
  },
  {
    id: "CARDIO",
    label: "Cardio",
    subtitle: "Conditioning & machines",
  },
];

export function parseMemberLibraryMuscleGroup(
  value: string | null | undefined,
): MemberLibraryMuscleFilter | null {
  const normalized = value?.trim().toUpperCase();
  if (!normalized) return null;
  return (MEMBER_LIBRARY_MUSCLE_FILTERS as readonly string[]).includes(normalized)
    ? (normalized as MemberLibraryMuscleFilter)
    : null;
}

export function memberLibraryFilterToCatalogMuscleGroup(
  filter: MemberLibraryMuscleFilter | null,
): MuscleGroup | null {
  if (
    !filter ||
    filter === "FULL_BODY" ||
    filter === "CARDIO"
  ) {
    return null;
  }
  return filter;
}

export type MemberLibraryCatalogBrowseQuery = {
  muscleGroup: MuscleGroup | null;
  fullBody: boolean;
  cardio: boolean;
};

export function memberLibraryFilterToCatalogBrowseQuery(
  filter: MemberLibraryMuscleFilter | null,
): MemberLibraryCatalogBrowseQuery {
  if (!filter) {
    return { muscleGroup: null, fullBody: false, cardio: false };
  }
  if (filter === "FULL_BODY") {
    return { muscleGroup: null, fullBody: true, cardio: false };
  }
  if (filter === "CARDIO") {
    return { muscleGroup: null, fullBody: false, cardio: true };
  }
  return { muscleGroup: filter, fullBody: false, cardio: false };
}

export function memberLibraryGroupLabel(
  filter: MemberLibraryMuscleFilter,
): string {
  return (
    MEMBER_LIBRARY_MUSCLE_GROUPS.find((g) => g.id === filter)?.label ?? filter
  );
}
