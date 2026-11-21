import type { CatalogExerciseInput } from "@/lib/catalog/types";
import type { MuscleGroup } from "@/lib/muscle-groups";

/**
 * Approved GymDesk catalog muscle-group overrides (stable catalogIds).
 * Source: product classification policy — do not auto-derive from RepDB body_part.
 */
export const APPROVED_CATALOG_MUSCLE_GROUP_OVERRIDES: Readonly<
  Record<string, MuscleGroup>
> = {
  "assisted-dips": "CHEST",
  "back-lever": "BACK",
  "battle-rope-double-slam": "SHOULDERS",
  "battle-ropes": "SHOULDERS",
  "bear-crawl": "CORE",
  "cat-cow": "CORE",
  "chin-tuck-hold": "CORE",
  "close-grip-bench-press": "CHEST",
  "close-grip-db-bench-press": "CHEST",
  "close-grip-ez-bar-bench-press": "CHEST",
  "close-grip-incline-bench": "CHEST",
  "crow-pose": "CORE",
  "db-kickstand-deadlift": "LEGS",
  "db-pullover": "BACK",
  deadlift: "LEGS",
  "deficit-deadlift": "LEGS",
  "double-db-kickstand-deadlift": "LEGS",
  "double-kettlebell-clean-and-press": "LEGS",
  "downward-dog-to-plank": "CORE",
  "dumbbell-deadlift": "LEGS",
  "dumbbell-farmers-walk": "SHOULDERS",
  "dumbbell-romanian-deadlift": "LEGS",
  "hex-bar-deadlift": "LEGS",
  "jefferson-curl": "CORE",
  "kettlebell-close-grip-floor-press": "CHEST",
  "kettlebell-deadlift": "LEGS",
  "kettlebell-farmers-walk": "SHOULDERS",
  "kettlebell-kickstand-deadlift": "LEGS",
  "kettlebell-single-leg-deadlift": "LEGS",
  "l-sit": "CORE",
  "pause-deadlift": "LEGS",
  "pilates-saw": "CORE",
  "pilates-spine-stretch-forward": "CORE",
  "revolved-crescent-lunge": "LEGS",
  "rowing-machine": "BACK",
  "seated-spinal-twist": "CORE",
  "single-leg-romanian-deadlift": "LEGS",
  "stiff-leg-deadlift": "LEGS",
  "sumo-deadlift": "LEGS",
  "supine-spinal-twist": "CORE",
  thruster: "LEGS",
};

/** Approved Full Body browse tag (35 catalogIds). */
export const APPROVED_FULL_BODY_CATALOG_IDS: readonly string[] = [
  "air-bike",
  "back-lever",
  "battle-rope-double-slam",
  "battle-ropes",
  "bear-crawl",
  "burpees",
  "clean",
  "clean-and-jerk",
  "double-kettlebell-clean",
  "double-kettlebell-clean-and-press",
  "double-kettlebell-dead-clean",
  "double-kettlebell-dead-split-snatch",
  "double-kettlebell-split-jerk",
  "double-kettlebell-swing-snatch",
  "dumbbell-farmers-walk",
  "dumbbell-snatch",
  "dumbbell-windmill",
  "hang-clean",
  "hang-power-clean",
  "kettlebell-farmers-walk",
  "kettlebell-lunge-press",
  "kettlebell-offset-reverse-lunge-and-press",
  "kettlebell-swing",
  "kettlebell-swing-clean",
  "kettlebell-turkish-get-ups",
  "kettlebell-windmills",
  "muscle-snatch",
  "one-arm-dumbbell-swing",
  "one-arm-kettlebell-floor-glute-bridge-press",
  "one-arm-kettlebell-swing",
  "push-jerk",
  "rowing-machine",
  "snatch",
  "split-jerk",
  "thruster",
] as const;

/** Approved Cardio browse tag (16 catalogIds). */
export const APPROVED_CARDIO_CATALOG_IDS: readonly string[] = [
  "air-bike",
  "battle-rope-double-slam",
  "battle-ropes",
  "burpees",
  "elliptical-trainer",
  "high-knees",
  "incline-treadmill-walk",
  "jump-rope",
  "jumping-jacks",
  "mountain-climbers",
  "rowing-machine",
  "running",
  "stair-climber",
  "stationary-bike",
  "treadmill-running",
  "walking",
] as const;

const FULL_BODY_SET = new Set(APPROVED_FULL_BODY_CATALOG_IDS);
const CARDIO_SET = new Set(APPROVED_CARDIO_CATALOG_IDS);

export const APPROVED_FULL_BODY_AND_CARDIO_OVERLAP: readonly string[] =
  APPROVED_FULL_BODY_CATALOG_IDS.filter((id) => CARDIO_SET.has(id));

/** RepDB ids containing deadlift/RDL — must never receive fullBody=true. */
export const DEADLIFT_RDL_CATALOG_ID_PATTERN =
  /deadlift|romanian-deadlift|-rdl\b/i;

export function approvedFullBodyForCatalogId(catalogId: string): boolean {
  return FULL_BODY_SET.has(catalogId);
}

export function approvedCardioForCatalogId(catalogId: string): boolean {
  return CARDIO_SET.has(catalogId);
}

/**
 * Applies approved muscle groups and browse tags when building or refreshing the bundle.
 * Preserves explicit fullBody/cardio on input when catalogId is not in approved sets (custom rows).
 */
export function applyApprovedCatalogClassification(
  input: CatalogExerciseInput,
): CatalogExerciseInput {
  const muscleGroup =
    APPROVED_CATALOG_MUSCLE_GROUP_OVERRIDES[input.catalogId] ?? input.muscleGroup;

  const fullBody = FULL_BODY_SET.has(input.catalogId)
    ? true
  : input.fullBody === true
      ? true
      : false;

  const cardio = CARDIO_SET.has(input.catalogId)
    ? true
    : input.cardio === true
      ? true
      : false;

  return {
    ...input,
    muscleGroup,
    fullBody,
    cardio,
  };
}

/**
 * Chin tuck: group is CORE; neck muscle slugs await taxonomy (no deep_neck_flexors / sternocleidomastoid).
 * TODO(taxonomy): remap primaryMuscles/secondaryMuscles when neck vocabulary is approved.
 */
export const CHIN_TUCK_HOLD_CATALOG_ID = "chin-tuck-hold";
