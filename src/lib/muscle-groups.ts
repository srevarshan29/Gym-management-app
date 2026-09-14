/** Shared muscle group enum — safe for client and server (no Firebase imports). */

export type MuscleGroup =
  | "CHEST"
  | "BACK"
  | "LEGS"
  | "SHOULDERS"
  | "ARMS"
  | "CORE";

export const MUSCLE_GROUP_VALUES = [
  "CHEST",
  "BACK",
  "LEGS",
  "SHOULDERS",
  "ARMS",
  "CORE",
] as const satisfies readonly MuscleGroup[];

export const MUSCLE_GROUP_OPTIONS: { value: MuscleGroup; label: string }[] = [
  { value: "CHEST", label: "Chest" },
  { value: "BACK", label: "Back" },
  { value: "LEGS", label: "Legs" },
  { value: "SHOULDERS", label: "Shoulders" },
  { value: "ARMS", label: "Arms" },
  { value: "CORE", label: "Core" },
];

export function muscleGroupLabel(group: MuscleGroup): string {
  return MUSCLE_GROUP_OPTIONS.find((o) => o.value === group)?.label ?? group;
}
