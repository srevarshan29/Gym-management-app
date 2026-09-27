/**
 * Build GymDesk bundled catalog from the official RepDB free exercise dataset.
 *
 * Source: https://github.com/RepDB/exercise-dataset (601 exercises, schema v3)
 *
 * Usage:
 *   npx tsx scripts/build-repdb-catalog-bundle.ts
 *   npx tsx scripts/build-repdb-catalog-bundle.ts --repdb-root "C:/path/to/exercise-dataset"
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";

import { sha256Hex } from "../src/lib/catalog/hash";
import {
  CATALOG_EXERCISES_PATH,
  CATALOG_IMAGES_DIR,
  CATALOG_MANIFEST_PATH,
} from "../src/lib/catalog/paths";
import type { CatalogExerciseInput } from "../src/lib/catalog/types";
import type { MuscleGroup } from "../src/lib/muscle-groups";

const DEFAULT_REPDB_ROOT = resolve(
  process.env.REPDB_DATASET_ROOT ??
    join(process.env.TEMP ?? process.env.TMP ?? "/tmp", "repdb-exercise-dataset"),
);

const CATALOG_VERSION = "repdb-free-v1";
const REPDB_ATTRIBUTION_TEXT = "Exercise data by RepDB (repdb.co)";
const REPDB_ATTRIBUTION_URL = "https://repdb.co";

type RepDbExercise = {
  id: string;
  name_en: string;
  description_en?: string | null;
  category?: string | null;
  force_type?: string | null;
  mechanic?: string | null;
  difficulty?: "beginner" | "intermediate" | "advanced" | null;
  equipment?: string | null;
  body_part?: string | null;
  primary_muscles?: string[];
  secondary_muscles?: string[] | null;
  is_bodyweight?: boolean;
  instructions_en?: string[];
  tips_en?: string[] | null;
  images?: {
    flat?: {
      start?: string;
      peak?: string;
      main?: string;
    };
  };
};

type RepDbRoot = {
  schema_version?: number;
  count?: number;
  exercises: RepDbExercise[];
};

function parseArgs(argv: string[]): { repdbRoot: string } {
  let repdbRoot = DEFAULT_REPDB_ROOT;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--repdb-root" && argv[i + 1]) {
      repdbRoot = resolve(argv[i + 1]!);
      i += 1;
    }
  }
  return { repdbRoot };
}

function humanizeToken(value: string): string {
  return value
    .trim()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");
}

function mapMuscleGroup(bodyPart: string | null | undefined, category: string | null | undefined): MuscleGroup {
  switch (bodyPart) {
    case "back":
      return "BACK";
    case "chest":
      return "CHEST";
    case "core":
      return "CORE";
    case "shoulders":
      return "SHOULDERS";
    case "upper_arms":
    case "lower_arms":
      return "ARMS";
    case "upper_legs":
    case "lower_legs":
      return "LEGS";
    case "full_body":
      if (category === "stretching") return "CORE";
      if (category === "cardio") return "LEGS";
      return "LEGS";
    default:
      return "CORE";
  }
}

function resolveRepDbImagePath(
  repdbRoot: string,
  relativePath: string | undefined,
): string | null {
  if (!relativePath || typeof relativePath !== "string") return null;
  const normalized = resolve(repdbRoot, relativePath);
  const root = resolve(repdbRoot);
  if (!normalized.startsWith(root)) {
    throw new Error(`RepDB image path escapes dataset root: ${relativePath}`);
  }
  if (!existsSync(normalized)) {
    return null;
  }
  return normalized;
}

function copyWebpAsset(sourcePath: string, destPath: string): void {
  mkdirSync(join(destPath, ".."), { recursive: true });
  copyFileSync(sourcePath, destPath);
}

function mapRepDbExercise(
  repdbRoot: string,
  exercise: RepDbExercise,
  imagesRoot: string,
): { row: CatalogExerciseInput; warnings: string[] } {
  const warnings: string[] = [];
  const flat = exercise.images?.flat;
  const startPath = resolveRepDbImagePath(repdbRoot, flat?.start);
  const peakPath = resolveRepDbImagePath(repdbRoot, flat?.peak);
  const mainPath = resolveRepDbImagePath(repdbRoot, flat?.main);

  const primarySource = startPath ?? mainPath;
  if (!primarySource) {
    throw new Error(`${exercise.id}: no start/main RepDB image found`);
  }

  const catalogId = exercise.id;
  const destDir = join(imagesRoot, catalogId);
  const primaryDest = join(destDir, "primary.webp");
  copyWebpAsset(primarySource, primaryDest);

  const mediaAssets: NonNullable<CatalogExerciseInput["mediaAssets"]> = {
    primary: "primary.webp",
  };

  if (peakPath) {
    copyWebpAsset(peakPath, join(destDir, "secondary.webp"));
    mediaAssets.secondary = "secondary.webp";
  }

  const thumbnailSource = startPath ?? mainPath ?? primarySource;
  copyWebpAsset(thumbnailSource, join(destDir, "thumbnail.webp"));
  mediaAssets.thumbnail = "thumbnail.webp";

  const instructions = (exercise.instructions_en ?? []).filter(
    (step) => typeof step === "string" && step.trim().length > 0,
  );
  if (instructions.length === 0) {
    throw new Error(`${exercise.id}: instructions_en is empty`);
  }

  if (!exercise.body_part) {
    warnings.push(`${exercise.id}: missing body_part; mapped muscleGroup to CORE`);
  }

  const row: CatalogExerciseInput = {
    catalogId,
    name: exercise.name_en.trim(),
    muscleGroup: mapMuscleGroup(exercise.body_part, exercise.category),
    description: exercise.description_en?.trim() || null,
    instructions,
    tips:
      exercise.tips_en && exercise.tips_en.length > 0
        ? exercise.tips_en.filter((tip) => typeof tip === "string" && tip.trim())
        : null,
    equipment: exercise.equipment ? humanizeToken(exercise.equipment) : null,
    bodyPart: exercise.body_part ? humanizeToken(exercise.body_part) : null,
    difficulty: exercise.difficulty ?? null,
    movementPattern: exercise.mechanic
      ? humanizeToken(exercise.mechanic)
      : exercise.force_type
        ? humanizeToken(exercise.force_type)
        : null,
    primaryMuscles: exercise.primary_muscles ?? [],
    secondaryMuscles: exercise.secondary_muscles ?? null,
    category: exercise.category ? humanizeToken(exercise.category) : null,
    isBodyweight: exercise.is_bodyweight ?? false,
    mediaAssets,
    provider: {
      provider: "repdb",
      providerExerciseId: exercise.id,
      attributionText: REPDB_ATTRIBUTION_TEXT,
      attributionUrl: REPDB_ATTRIBUTION_URL,
      licenseTier: "free",
    },
  };

  return { row, warnings };
}

function main() {
  const { repdbRoot } = parseArgs(process.argv.slice(2));
  const repdbJsonPath = join(repdbRoot, "exercises.json");

  if (!existsSync(repdbJsonPath)) {
    console.error(
      `RepDB dataset not found at ${repdbJsonPath}. Clone https://github.com/RepDB/exercise-dataset or set REPDB_DATASET_ROOT.`,
    );
    process.exit(1);
  }

  const repdb = JSON.parse(readFileSync(repdbJsonPath, "utf8")) as RepDbRoot;
  if (!Array.isArray(repdb.exercises) || repdb.exercises.length === 0) {
    console.error("RepDB exercises.json has no exercises array.");
    process.exit(1);
  }

  if (existsSync(CATALOG_IMAGES_DIR)) {
    rmSync(CATALOG_IMAGES_DIR, { recursive: true, force: true });
  }
  mkdirSync(CATALOG_IMAGES_DIR, { recursive: true });

  const rows: CatalogExerciseInput[] = [];
  const allWarnings: string[] = [];

  for (const exercise of repdb.exercises) {
    const { row, warnings } = mapRepDbExercise(repdbRoot, exercise, CATALOG_IMAGES_DIR);
    rows.push(row);
    allWarnings.push(...warnings);
  }

  rows.sort((a, b) => a.catalogId.localeCompare(b.catalogId));

  const exercisesJson = `${JSON.stringify(rows, null, 2)}\n`;
  writeFileSync(CATALOG_EXERCISES_PATH, exercisesJson, "utf8");

  const manifest = {
    catalogVersion: CATALOG_VERSION,
    provider: "repdb" as const,
    exerciseCount: rows.length,
    sha256OfJson: sha256Hex(exercisesJson),
    syncedAt: null,
  };
  writeFileSync(
    CATALOG_MANIFEST_PATH,
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  const barbell = rows.find((row) => row.catalogId === "barbell-row");
  console.log(`RepDB root: ${repdbRoot}`);
  console.log(`Wrote ${rows.length} exercises to ${CATALOG_EXERCISES_PATH}`);
  console.log(`Manifest SHA-256: ${manifest.sha256OfJson}`);
  console.log(
    `Barbell row: ${barbell?.name ?? "MISSING"} (${barbell?.catalogId ?? "n/a"})`,
  );
  if (allWarnings.length > 0) {
    console.log(`Warnings (${allWarnings.length}):`);
    for (const warning of allWarnings.slice(0, 20)) {
      console.log(`  - ${warning}`);
    }
    if (allWarnings.length > 20) {
      console.log(`  ... and ${allWarnings.length - 20} more`);
    }
  }
}

main();
