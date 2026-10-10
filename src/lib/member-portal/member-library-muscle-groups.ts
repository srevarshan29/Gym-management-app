import type { MuscleGroup } from "@/lib/muscle-groups";

/** Member library browse filters (includes Full Body; catalog uses CORE separately). */
export type MemberLibraryMuscleFilter =
  | "CHEST"
  | "BACK"
  | "SHOULDERS"
  | "ARMS"
  | "LEGS"
  | "FULL_BODY";

export const MEMBER_LIBRARY_MUSCLE_FILTERS = [
  "CHEST",
  "BACK",
  "SHOULDERS",
  "ARMS",
  "LEGS",
  "FULL_BODY",
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
    id: "FULL_BODY",
    label: "Full Body",
    subtitle: "Compound & cardio",
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
  if (!filter || filter === "FULL_BODY") return null;
  return filter;
}

export function memberLibraryGroupLabel(
  filter: MemberLibraryMuscleFilter,
): string {
  return (
    MEMBER_LIBRARY_MUSCLE_GROUPS.find((g) => g.id === filter)?.label ?? filter
  );
}
